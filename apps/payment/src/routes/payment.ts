import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { natsClient } from '@careforall/events';
import Redis from 'ioredis';
import { logger } from '@careforall/common';

const app = new Hono();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const processPaymentSchema = z.object({
  pledgeId: z.number(),
  amount: z.number(),
  currency: z.string().default('USD'),
});

const webhookSchema = z.object({
  eventId: z.string(),
  pledgeId: z.number(),
  status: z.enum(['succeeded', 'failed']),
});

// Mock Payment Processing Endpoint (called by Pledge Service or Frontend)
app.post('/process', zValidator('json', processPaymentSchema), async (c) => {
  const { pledgeId, amount } = (c as any).req.valid('json');
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Random success/failure (90% success)
  const success = Math.random() > 0.1;
  const status = success ? 'succeeded' : 'failed';

  // In a real world, this would trigger a webhook from the provider side.
  // Here we can simulate the webhook call or just return the result.
  // For the hackathon problem, we need to handle "retried webhooks".
  
  // Let's return the status and assume the provider will send a webhook later.
  return c.json({ status, transactionId: `tx_${pledgeId}_${Date.now()}` });
});

// Webhook Endpoint (called by Payment Provider)
app.post('/webhook', zValidator('json', webhookSchema), async (c) => {
  const { eventId, pledgeId, status } = (c as any).req.valid('json');
  
  // Idempotency Check
  const key = `webhook:${eventId}`;
  const processed = await redis.get(key);
  
  if (processed) {
    logger.info(`Duplicate webhook received: ${eventId}`);
    return c.json({ received: true });
  }

  // Process Webhook
  logger.info(`Processing webhook: ${eventId} for pledge ${pledgeId} -> ${status}`);

  // Publish event to internal system
  await natsClient.publish('payment.update', { pledgeId, status });

  // Mark as processed (expire in 24h)
  await redis.set(key, 'processed', 'EX', 86400);

  return c.json({ received: true });
});

export const paymentRoutes = app;
