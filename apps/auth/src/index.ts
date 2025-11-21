import { Hono } from 'hono';
import { logger, performHealthCheck, validateEnv, validateJWTSecret } from '@careforall/common';
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
  logger.info(`[${c.req.method}] ${c.req.url}`);
  await next();
});

app.route('/auth', authRoutes);

app.get('/health', async (c) => {
  return c.json({ status: 'ok', service: 'auth' });
});

app.get('/metrics', (c) => {
  // Basic metrics - can be enhanced with prom-client
  return c.text(`# HELP auth_service_up Auth service is running
# TYPE auth_service_up gauge
auth_service_up 1
`);
});

export default {
  port: 3001,
  fetch: app.fetch,
};
