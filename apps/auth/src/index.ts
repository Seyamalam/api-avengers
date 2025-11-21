import { Hono } from 'hono';
import { logger, performHealthCheck, validateEnv, validateJWTSecret, register, httpRequestCounter, httpRequestDuration } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { authRoutes } from './routes/auth';

// Validate environment variables
validateEnv({
  required: ['DATABASE_URL', 'JWT_SECRET'],
  optional: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
});
validateJWTSecret();

initTelemetry('auth-service');

const app = new Hono();

app.use('*', async (c, next) => {
  const start = Date.now();
  const route = c.req.path;
  const method = c.req.method;
  
  logger.info(`[${method}] ${c.req.url}`);
  
  await next();
  
  const duration = (Date.now() - start) / 1000;
  const status = c.res.status.toString();
  
  httpRequestCounter.inc({ method, route, status, service: 'auth' });
  httpRequestDuration.observe({ method, route, status, service: 'auth' }, duration);
});

app.route('/auth', authRoutes);

app.get('/health', async (c) => {
  return c.json({ status: 'ok', service: 'auth' });
});

app.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.text(metrics);
});

export default {
  port: 3001,
  fetch: app.fetch,
};
