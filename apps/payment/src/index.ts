import { Hono } from 'hono';
import { logger } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { natsClient } from '@careforall/events';
import { paymentRoutes } from './routes/payment';

initTelemetry('payment-service');

const app = new Hono();

natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']).catch(err => {
  logger.error('Failed to connect to NATS', err);
});

app.use('*', async (c, next) => {
  logger.info(`[${c.req.method}] ${c.req.url}`);
  await next();
});

app.route('/payments', paymentRoutes);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/metrics', (c) => {
  return c.text(`# HELP payment_service_up Payment service is running
# TYPE payment_service_up gauge
payment_service_up 1
`);
});

export default {
  port: 3004,
  fetch: app.fetch,
};
