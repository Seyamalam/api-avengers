import { Hono } from 'hono';
import { logger, idempotency, performHealthCheck, validateEnv } from '@careforall/common';
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
  logger.info(`[${c.req.method}] ${c.req.url}`);
  await next();
});

// Apply idempotency middleware globally or to specific routes
app.use('/pledges/*', idempotency());

app.route('/pledges', pledgeRoutes);

app.get('/health', async (c) => {
  return c.json({ status: 'ok', service: 'pledge' });
});

app.get('/metrics', (c) => {
  return c.text(`# HELP pledge_service_up Pledge service is running
# TYPE pledge_service_up gauge
pledge_service_up 1
`);
});

export default {
  port: 3003,
  fetch: app.fetch,
};
