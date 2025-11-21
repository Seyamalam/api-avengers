import { pgTable, serial, text, integer, timestamp, boolean, jsonb, decimal, uuid } from 'drizzle-orm/pg-core';

// Auth Service Tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Campaign Service Tables
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  goalAmount: integer('goal_amount').notNull(),
  currentAmount: integer('current_amount').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const campaignProcessedEvents = pgTable('campaign_processed_events', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(), // Use aggregateId + version or similar, or just unique event ID if available
  pledgeId: integer('pledge_id').notNull(),
  processedAt: timestamp('processed_at').defaultNow(),
});

// Pledge Service Tables
export const pledges = pgTable('pledges', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull(),
  userId: integer('user_id'), // Nullable for guest donations
  amount: integer('amount').notNull(),
  status: text('status').default('PENDING'), // PENDING, AUTHORIZED, CAPTURED, FAILED
  paymentId: text('payment_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const outbox = pgTable('outbox', {
  id: serial('id').primaryKey(),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at'),
});

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
