import { Hono } from 'hono';
import { logger, performHealthCheck, validateEnv, register, httpRequestCounter, httpRequestDuration } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { natsClient } from '@careforall/events';
import { campaignRoutes } from './routes/campaigns';
import { startConsumers } from './consumers';

// Validate environment variables
validateEnv({
  required: ['DATABASE_URL', 'REDIS_URL', 'NATS_URL'],
  optional: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
});

initTelemetry('campaign-service');

const app = new Hono();

// Connect to NATS
natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']).catch(err => {
  logger.error('Failed to connect to NATS', err);
});

// Start consumers for pledge updates
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
  
  httpRequestCounter.inc({ method, route, status, service: 'campaign' });
  httpRequestDuration.observe({ method, route, status, service: 'campaign' }, duration);
});

app.route('/campaigns', campaignRoutes);

app.get('/health', async (c) => {
  return c.json({ status: 'ok', service: 'campaign' });
});

app.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.text(metrics);
});

export default {
  port: 3002,
  fetch: app.fetch,
};
