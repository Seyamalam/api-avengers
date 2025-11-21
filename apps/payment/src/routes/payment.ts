import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { natsClient } from '@careforall/events';
import { logger, idempotency, paymentSucceededTotal, paymentFailedTotal } from '@careforall/common';

const app = new Hono();

const BANK_SERVICE_URL = process.env.BANK_SERVICE_URL || 'http://bank:3005';

const processPaymentSchema = z.object({
  pledgeId: z.number(),
  amount: z.number(),
  currency: z.string().default('USD'),
  accountNumber: z.string(), // Bank account to debit from
});

const webhookSchema = z.object({
  eventId: z.string(),
  pledgeId: z.number(),
  status: z.enum(['authorized', 'captured', 'failed']),
  holdId: z.string().optional(),
  transactionId: z.string().optional(),
  error: z.string().optional(),
});

const capturePaymentSchema = z.object({
  pledgeId: z.number(),
  holdId: z.string(),
});

// Authorize Payment - Check balance and place hold
app.post('/authorize', zValidator('json', processPaymentSchema), async (c) => {
  const { pledgeId, amount, accountNumber } = c.req.valid('json');
  
  logger.info(`Authorizing payment: Pledge ${pledgeId}, Amount ${amount}, Account ${accountNumber}`);
  
  try {
    // Call bank service to authorize payment (place hold)
    const response = await fetch(`${BANK_SERVICE_URL}/bank/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountNumber,
        amount,
        reference: `pledge_${pledgeId}`,
        description: `Donation pledge #${pledgeId}`,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      logger.error(`Authorization failed for pledge ${pledgeId}: ${result.error}`);
      
      // Send failure webhook
      await sendWebhook({
        eventId: `auth_fail_${pledgeId}_${Date.now()}`,
        pledgeId,
        status: 'failed',
        error: result.error || 'Authorization failed',
      });

      return c.json({
        success: false,
        error: result.error || 'Authorization failed',
      }, 400);
    }

    logger.info(`Payment authorized: Pledge ${pledgeId}, Hold ID ${result.holdId}`);

    // Send authorization webhook
    await sendWebhook({
      eventId: `auth_${pledgeId}_${Date.now()}`,
      pledgeId,
      status: 'authorized',
      holdId: result.holdId,
    });

    return c.json({
      success: true,
      holdId: result.holdId,
      status: 'authorized',
    });
  } catch (error) {
    logger.error(`Error authorizing payment for pledge ${pledgeId}`, error);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});

// Capture Payment - Convert hold to actual charge
app.post('/capture', zValidator('json', capturePaymentSchema), async (c) => {
  const { pledgeId, holdId } = c.req.valid('json');
  
  logger.info(`Capturing payment: Pledge ${pledgeId}, Hold ID ${holdId}`);
  
  try {
    // Call bank service to capture payment
    const response = await fetch(`${BANK_SERVICE_URL}/bank/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdId }),
    });

    const result = await response.json();

    if (!result.success) {
      logger.error(`Capture failed for pledge ${pledgeId}: ${result.error}`);
      
      // Send failure webhook
      await sendWebhook({
        eventId: `capture_fail_${pledgeId}_${Date.now()}`,
        pledgeId,
        status: 'failed',
        error: result.error || 'Capture failed',
      });

      return c.json({
        success: false,
        error: result.error || 'Capture failed',
      }, 400);
    }

    logger.info(`Payment captured: Pledge ${pledgeId}, Transaction ID ${result.transactionId}`);

    // Send capture webhook
    await sendWebhook({
      eventId: `capture_${pledgeId}_${Date.now()}`,
      pledgeId,
      status: 'captured',
      transactionId: result.transactionId,
      holdId,
    });

    return c.json({
      success: true,
      transactionId: result.transactionId,
      status: 'captured',
    });
  } catch (error) {
    logger.error(`Error capturing payment for pledge ${pledgeId}`, error);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});

// Helper function to send webhook (simulating payment provider webhook)
async function sendWebhook(data: any) {
  try {
    // In production, this would be called by the payment provider
    // For our simulation, we call our own webhook endpoint
    const response = await fetch(`${process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:3004'}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      logger.error(`Failed to send webhook: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Error sending webhook', error);
  }
}

// Webhook Endpoint (called by Payment Provider - or self in our simulation)
app.post(
  '/webhook',
  zValidator('json', webhookSchema),
  idempotency((c) => {
    const data = c.req.valid('json');
    return `webhook:${data.eventId}`;
  }),
  async (c) => {
    const { eventId, pledgeId, status, holdId, transactionId, error } = c.req.valid('json');

    // Process Webhook
    logger.info(`Processing webhook: ${eventId} for pledge ${pledgeId} -> ${status}`);

    // Update metrics
    if (status === 'captured') {
      paymentSucceededTotal.inc();
    } else if (status === 'failed') {
      paymentFailedTotal.inc();
    }

    // Publish event to internal system via NATS
    await natsClient.publish('payment.update', {
      pledgeId,
      status,
      holdId,
      transactionId,
      error,
      timestamp: new Date().toISOString(),
    });

    return c.json({ received: true });
  }
);

export const paymentRoutes = app;
