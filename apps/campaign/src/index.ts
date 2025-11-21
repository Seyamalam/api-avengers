import { Hono } from 'hono';
import { logger } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import { natsClient } from '@careforall/events';
import { campaignRoutes } from './routes/campaigns';
import { startConsumers } from './consumers';

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
  logger.info(`[${c.req.method}] ${c.req.url}`);
  await next();
});

app.route('/campaigns', campaignRoutes);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/metrics', (c) => {
  return c.text(`# HELP campaign_service_up Campaign service is running
# TYPE campaign_service_up gauge
campaign_service_up 1
`);
});

export default {
  port: 3002,
  fetch: app.fetch,
};
