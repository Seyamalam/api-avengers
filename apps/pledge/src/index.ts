import { Hono } from 'hono';
import { logger, idempotency, performHealthCheck, validateEnv, register, httpRequestCounter, httpRequestDuration } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { pledgeRoutes } from './routes/pledges';
import { startConsumers } from './consumers';

// Validate environment variables
validateEnv({
  required: ['DATABASE_URL', 'REDIS_URL', 'NATS_URL'],
  optional: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
});

initTelemetry('pledge-service');

const app = new Hono();

// Start consumers
startConsumers().catch(err => {
  logger.error('Failed to start consumers', err);
});

app.use('*', async (c, next) => {
  const start = Date.now();
  const route = c.req.path;
  const method = c.req.method;
  
  logger.info(`[${method}] ${c.req.url}`);
  
  await next();
  
  const duration = (Date.now() - start) / 1000;
  const status = c.res.status.toString();
  
  httpRequestCounter.inc({ method, route, status, service: 'pledge' });
  httpRequestDuration.observe({ method, route, status, service: 'pledge' }, duration);
});

// Apply idempotency middleware globally or to specific routes
app.use('/pledges/*', idempotency());

app.route('/pledges', pledgeRoutes);

app.get('/health', async (c) => {
  return c.json({ status: 'ok', service: 'pledge' });
});

app.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.text(metrics);
});

export default {
  port: 3003,
  fetch: app.fetch,
};
