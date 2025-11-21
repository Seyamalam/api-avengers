import { Hono } from 'hono';
import { logger } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { authRoutes } from './routes/auth';

initTelemetry('auth-service');

const app = new Hono();

app.use('*', async (c, next) => {
  logger.info(`[${c.req.method}] ${c.req.url}`);
  await next();
});

app.route('/auth', authRoutes);

app.get('/health', (c) => c.json({ status: 'ok' }));

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
