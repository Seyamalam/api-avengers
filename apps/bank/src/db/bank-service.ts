import { db, bankSchema } from '@careforall/db';
const { bankAccounts, bankTransactions, bankHolds } = bankSchema;
import { eq, and, lt, sql } from 'drizzle-orm';
import { logger } from '@careforall/common';

export interface AuthorizePaymentRequest {
  accountNumber: string;
  amount: number;
  reference: string;
  description?: string;
}

export interface CapturePaymentRequest {
  holdId: string;
}

export interface ReleaseHoldRequest {
  holdId: string;
}

export class BankService {
  /**
   * Check if account exists and has sufficient balance
   */
  async checkBalance(accountNumber: string, amount: number): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.accountNumber, accountNumber),
      });

      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      if (!account.isActive) {
        return { success: false, error: 'Account is not active' };
      }

      const currentBalance = parseFloat(account.balance);
      
      // Calculate total active holds
      const holds = await db.query.bankHolds.findMany({
        where: and(
          eq(bankHolds.accountId, account.id),
          eq(bankHolds.status, 'ACTIVE')
        ),
      });

      const totalHeld = holds.reduce((sum, hold) => sum + parseFloat(hold.amount), 0);
      const availableBalance = currentBalance - totalHeld;

      if (availableBalance < amount) {
        return {
          success: false,
          balance: availableBalance,
          error: 'Insufficient funds',
        };
      }

      return { success: true, balance: availableBalance };
    } catch (error) {
      logger.error('Error checking balance', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Authorize payment - places a hold on funds
   */
  async authorizePayment(request: AuthorizePaymentRequest): Promise<{
    success: boolean;
    holdId?: string;
    error?: string;
  }> {
    try {
      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.accountNumber, request.accountNumber),
      });

      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      // Check if already authorized for this reference
      const existingHold = await db.query.bankHolds.findFirst({
        where: and(
          eq(bankHolds.accountId, account.id),
          eq(bankHolds.reference, request.reference),
          eq(bankHolds.status, 'ACTIVE')
        ),
      });

      if (existingHold) {
        return { success: true, holdId: existingHold.holdId };
      }

      // Check balance
      const balanceCheck = await this.checkBalance(request.accountNumber, request.amount);
      if (!balanceCheck.success) {
        return { success: false, error: balanceCheck.error };
      }

      // Create hold (expires in 24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const [hold] = await db
        .insert(bankHolds)
        .values({
          accountId: account.id,
          amount: request.amount.toFixed(2),
          reference: request.reference,
          status: 'ACTIVE',
          expiresAt,
        })
        .returning();

      logger.info(`Payment authorized: ${hold.holdId} for ${request.accountNumber}`);

      return { success: true, holdId: hold.holdId };
    } catch (error) {
      logger.error('Error authorizing payment', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Capture payment - converts hold to actual debit
   */
  async capturePayment(request: CapturePaymentRequest): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      const hold = await db.query.bankHolds.findFirst({
        where: eq(bankHolds.holdId, request.holdId),
      });

      if (!hold) {
        return { success: false, error: 'Hold not found' };
      }

      if (hold.status !== 'ACTIVE') {
        return { success: false, error: `Hold is ${hold.status}` };
      }

      // Check if expired
      if (new Date() > hold.expiresAt) {
        await db
          .update(bankHolds)
          .set({ status: 'EXPIRED', completedAt: new Date() })
          .where(eq(bankHolds.id, hold.id));

        return { success: false, error: 'Hold has expired' };
      }

      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, hold.accountId),
      });

      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      const amount = parseFloat(hold.amount);
      const balanceBefore = parseFloat(account.balance);
      const balanceAfter = balanceBefore - amount;

      // Create transaction and update balance in a transaction
      await db.transaction(async (tx) => {
        // Debit transaction
        const [transaction] = await tx
          .insert(bankTransactions)
          .values({
            accountId: account.id,
            type: 'DEBIT',
            amount: amount.toFixed(2),
            balanceBefore: balanceBefore.toFixed(2),
            balanceAfter: balanceAfter.toFixed(2),
            reference: hold.reference,
            status: 'COMPLETED',
            description: `Payment capture for ${hold.reference}`,
          })
          .returning();

        // Update account balance
        await tx
          .update(bankAccounts)
          .set({
            balance: balanceAfter.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(bankAccounts.id, account.id));

        // Mark hold as captured
        await tx
          .update(bankHolds)
          .set({ status: 'CAPTURED', completedAt: new Date() })
          .where(eq(bankHolds.id, hold.id));

        logger.info(`Payment captured: ${transaction.transactionId} for account ${account.accountNumber}`);
      });

      // Get the transaction ID
      const [transaction] = await db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.reference, hold.reference))
        .orderBy(sql`${bankTransactions.createdAt} DESC`)
        .limit(1);

      return { success: true, transactionId: transaction.transactionId };
    } catch (error) {
      logger.error('Error capturing payment', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Release hold - cancels authorization
   */
  async releaseHold(request: ReleaseHoldRequest): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const hold = await db.query.bankHolds.findFirst({
        where: eq(bankHolds.holdId, request.holdId),
      });

      if (!hold) {
        return { success: false, error: 'Hold not found' };
      }

      if (hold.status !== 'ACTIVE') {
        return { success: false, error: `Hold is already ${hold.status}` };
      }

      await db
        .update(bankHolds)
        .set({ status: 'RELEASED', completedAt: new Date() })
        .where(eq(bankHolds.id, hold.id));

      logger.info(`Hold released: ${hold.holdId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error releasing hold', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Get account details
   */
  async getAccount(accountNumber: string) {
    try {
      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.accountNumber, accountNumber),
      });

      if (!account) {
        return null;
      }

      // Get active holds
      const holds = await db.query.bankHolds.findMany({
        where: and(
          eq(bankHolds.accountId, account.id),
          eq(bankHolds.status, 'ACTIVE')
        ),
      });

      const totalHeld = holds.reduce((sum, hold) => sum + parseFloat(hold.amount), 0);
      const availableBalance = parseFloat(account.balance) - totalHeld;

      return {
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
        email: account.email,
        balance: parseFloat(account.balance),
        heldAmount: totalHeld,
        availableBalance,
        currency: account.currency,
        isActive: account.isActive,
      };
    } catch (error) {
      logger.error('Error getting account', error);
      return null;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(accountNumber: string, limit = 50) {
    try {
      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.accountNumber, accountNumber),
      });

      if (!account) {
        return [];
      }

      const transactions = await db.query.bankTransactions.findMany({
        where: eq(bankTransactions.accountId, account.id),
        orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
        limit,
      });

      return transactions.map((tx) => ({
        transactionId: tx.transactionId,
        type: tx.type,
        amount: parseFloat(tx.amount),
        balanceBefore: parseFloat(tx.balanceBefore),
        balanceAfter: parseFloat(tx.balanceAfter),
        reference: tx.reference,
        status: tx.status,
        description: tx.description,
        createdAt: tx.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting transactions', error);
      return [];
    }
  }
}

export const bankService = new BankService();
