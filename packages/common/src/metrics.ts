import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a Registry
export const register = new Registry();

// Default metrics (CPU, memory, etc.)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register });

// HTTP Request metrics
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'service'],
  registers: [register]
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

// Business metrics
export const campaignsTotal = new Gauge({
  name: 'campaigns_total',
  help: 'Total number of campaigns',
  registers: [register]
});

export const pledgesTotal = new Counter({
  name: 'pledges_total',
  help: 'Total number of pledges created',
  labelNames: ['status'],
  registers: [register]
});

export const donationAmount = new Counter({
  name: 'donation_amount_total',
  help: 'Total donation amount in cents',
  registers: [register]
});

export const campaignGoalAmount = new Gauge({
  name: 'campaign_goal_amount',
  help: 'Campaign goal amount',
  labelNames: ['campaign_id'],
  registers: [register]
});

export const campaignCurrentAmount = new Gauge({
  name: 'campaign_current_amount',
  help: 'Campaign current amount raised',
  labelNames: ['campaign_id'],
  registers: [register]
});

export const paymentSucceededTotal = new Counter({
  name: 'payment_succeeded_total',
  help: 'Total number of successful payments',
  registers: [register]
});

export const paymentFailedTotal = new Counter({
  name: 'payment_failed_total',
  help: 'Total number of failed payments',
  registers: [register]
});

// NATS/Event metrics
export const eventsPublished = new Counter({
  name: 'events_published_total',
  help: 'Total number of events published',
  labelNames: ['event_type'],
  registers: [register]
});

export const eventsConsumed = new Counter({
  name: 'events_consumed_total',
  help: 'Total number of events consumed',
  labelNames: ['event_type', 'status'],
  registers: [register]
});

export const outboxQueueDepth = new Gauge({
  name: 'outbox_queue_depth',
  help: 'Number of pending events in outbox',
  registers: [register]
});

// Database metrics
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register]
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  registers: [register]
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  registers: [register]
});

// Authentication metrics
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['status', 'method'],
  registers: [register]
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [register]
});
