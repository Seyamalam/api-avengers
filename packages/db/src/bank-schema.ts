import { pgTable, serial, text, integer, timestamp, decimal, uuid, boolean } from 'drizzle-orm/pg-core';

// Bank Service Tables
export const bankAccounts = pgTable('bank_accounts', {
  id: serial('id').primaryKey(),
  accountNumber: text('account_number').notNull().unique(),
  accountHolderName: text('account_holder_name').notNull(),
  email: text('email').notNull(),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  currency: text('currency').default('USD'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const bankTransactions = pgTable('bank_transactions', {
  id: serial('id').primaryKey(),
  transactionId: uuid('transaction_id').notNull().unique().defaultRandom(),
  accountId: integer('account_id').notNull().references(() => bankAccounts.id),
  type: text('type').notNull(), // DEBIT, CREDIT, HOLD, RELEASE
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
  reference: text('reference'), // External reference (pledgeId, etc.)
  status: text('status').default('COMPLETED'), // PENDING, COMPLETED, FAILED, REVERSED
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankHolds = pgTable('bank_holds', {
  id: serial('id').primaryKey(),
  holdId: uuid('hold_id').notNull().unique().defaultRandom(),
  accountId: integer('account_id').notNull().references(() => bankAccounts.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  reference: text('reference').notNull(), // pledgeId
  status: text('status').default('ACTIVE'), // ACTIVE, CAPTURED, RELEASED, EXPIRED
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
