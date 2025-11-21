import { describe, it, expect, beforeAll } from 'bun:test';
import { bankService } from '../src/db/bank-service';

describe('Bank Service', () => {
  describe('checkBalance', () => {
    it('should return success for valid account with sufficient balance', async () => {
      const result = await bankService.checkBalance('ACC001', 100);
      expect(result.success).toBe(true);
      expect(result.balance).toBeGreaterThanOrEqual(100);
    });

    it('should return error for insufficient funds', async () => {
      const result = await bankService.checkBalance('ACC051', 1000);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should return error for non-existent account', async () => {
      const result = await bankService.checkBalance('ACC999', 100);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found');
    });
  });

  describe('authorizePayment', () => {
    it('should successfully authorize payment with valid account', async () => {
      const result = await bankService.authorizePayment({
        accountNumber: 'ACC001',
        amount: 50,
        reference: 'test_' + Date.now(),
        description: 'Test authorization',
      });
      
      expect(result.success).toBe(true);
      expect(result.holdId).toBeDefined();
    });

    it('should fail authorization for insufficient funds', async () => {
      const result = await bankService.authorizePayment({
        accountNumber: 'ACC051',
        amount: 1000,
        reference: 'test_fail_' + Date.now(),
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should return existing hold for duplicate authorization', async () => {
      const reference = 'test_duplicate_' + Date.now();
      
      const result1 = await bankService.authorizePayment({
        accountNumber: 'ACC001',
        amount: 50,
        reference,
      });
      
      const result2 = await bankService.authorizePayment({
        accountNumber: 'ACC001',
        amount: 50,
        reference,
      });
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.holdId).toBe(result2.holdId);
    });
  });

  describe('capturePayment', () => {
    it('should successfully capture authorized payment', async () => {
      // First authorize
      const authResult = await bankService.authorizePayment({
        accountNumber: 'ACC001',
        amount: 75,
        reference: 'test_capture_' + Date.now(),
      });
      
      expect(authResult.success).toBe(true);
      
      // Then capture
      const captureResult = await bankService.capturePayment({
        holdId: authResult.holdId!,
      });
      
      expect(captureResult.success).toBe(true);
      expect(captureResult.transactionId).toBeDefined();
    });

    it('should fail to capture non-existent hold', async () => {
      const result = await bankService.capturePayment({
        holdId: 'non-existent-hold-id',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Hold not found');
    });
  });

  describe('releaseHold', () => {
    it('should successfully release hold', async () => {
      // First authorize
      const authResult = await bankService.authorizePayment({
        accountNumber: 'ACC001',
        amount: 60,
        reference: 'test_release_' + Date.now(),
      });
      
      expect(authResult.success).toBe(true);
      
      // Then release
      const releaseResult = await bankService.releaseHold({
        holdId: authResult.holdId!,
      });
      
      expect(releaseResult.success).toBe(true);
    });
  });

  describe('getAccount', () => {
    it('should return account details', async () => {
      const account = await bankService.getAccount('ACC001');
      
      expect(account).not.toBeNull();
      expect(account?.accountNumber).toBe('ACC001');
      expect(account?.accountHolderName).toBe('John Doe');
      expect(account?.balance).toBeGreaterThan(0);
      expect(account?.availableBalance).toBeLessThanOrEqual(account?.balance!);
    });

    it('should return null for non-existent account', async () => {
      const account = await bankService.getAccount('ACC999');
      expect(account).toBeNull();
    });
  });

  describe('getTransactions', () => {
    it('should return transaction history', async () => {
      // Create a transaction first
      const authResult = await bankService.authorizePayment({
        accountNumber: 'ACC001',
        amount: 25,
        reference: 'test_history_' + Date.now(),
      });
      
      await bankService.capturePayment({ holdId: authResult.holdId! });
      
      // Get transactions
      const transactions = await bankService.getTransactions('ACC001', 10);
      
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);
    });
  });
});
