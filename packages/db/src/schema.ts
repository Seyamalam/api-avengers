import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

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
