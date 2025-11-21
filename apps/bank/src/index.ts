import { Hono } from 'hono';
import { logger, validateEnv, register, httpRequestCounter, httpRequestDuration } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { bankRoutes } from './routes/bank';

// Validate environment variables
validateEnv({
  required: ['DATABASE_URL'],
  optional: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
});

initTelemetry('bank-service');

const app = new Hono();

// Logging and metrics middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  const route = c.req.path;
  const method = c.req.method;
  
  logger.info(`[${method}] ${c.req.url}`);
  
  await next();
  
  const duration = (Date.now() - start) / 1000;
  const status = c.res.status.toString();
  
  httpRequestCounter.inc({ method, route, status, service: 'bank' });
  httpRequestDuration.observe({ method, route, status, service: 'bank' }, duration);
});

app.route('/bank', bankRoutes);

app.get('/health', async (c) => {
  return c.json({ status: 'ok', service: 'bank' });
});

app.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.text(metrics);
});

const port = process.env.PORT || 3005;

logger.info(`Bank service starting on port ${port}`);

export default {
  port: Number(port),
  fetch: app.fetch,
};
