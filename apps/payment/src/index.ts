import { Hono } from 'hono';
import { logger, performHealthCheck, validateEnv, register, httpRequestCounter, httpRequestDuration } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { natsClient } from '@careforall/events';
import { paymentRoutes } from './routes/payment';

// Validate environment variables
validateEnv({
  required: ['REDIS_URL', 'NATS_URL'],
  optional: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
});

initTelemetry('payment-service');

const app = new Hono();

natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']).catch(err => {
  logger.error('Failed to connect to NATS', err);
});

app.use('*', async (c, next) => {
  const start = Date.now();
  const route = c.req.path;
  const method = c.req.method;
  
  logger.info(`[${method}] ${c.req.url}`);
  
  await next();
  
  const duration = (Date.now() - start) / 1000;
  const status = c.res.status.toString();
  
  httpRequestCounter.inc({ method, route, status, service: 'payment' });
  httpRequestDuration.observe({ method, route, status, service: 'payment' }, duration);
});

app.route('/payments', paymentRoutes);

app.get('/health', async (c) => {
  return c.json({ status: 'ok', service: 'payment' });
});

app.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.text(metrics);
});

export default {
  port: 3004,
  fetch: app.fetch,
};
