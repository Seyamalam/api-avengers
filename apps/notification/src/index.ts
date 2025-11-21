import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';
import { natsClient } from '@careforall/events';
import { logger, validateEnv } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';
import type { WSContext } from 'hono/ws';

validateEnv({
  required: [],
  optional: ['NATS_URL', 'PORT', 'OTEL_EXPORTER_OTLP_ENDPOINT'],
});

initTelemetry('notification-service');

const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const connectedClients = new Set<WSContext>();

// Connect to NATS
const startNats = async () => {
  try {
    await natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']);
    logger.info('Notification Service connected to NATS');

    // Subscribe to relevant events
    natsClient.subscribe('campaign.created', (data: any) => {
      broadcast({ type: 'CAMPAIGN_CREATED', data });
    });

    natsClient.subscribe('pledge.created', (data: any) => {
      broadcast({ type: 'PLEDGE_CREATED', data });
    });
    
    natsClient.subscribe('payment.succeeded', (data: any) => {
      broadcast({ type: 'PAYMENT_SUCCEEDED', data });
    });

  } catch (err) {
    logger.error('Failed to connect to NATS', err);
    setTimeout(startNats, 5000);
  }
};

startNats();

const broadcast = (message: any) => {
  const msgString = JSON.stringify(message);
  for (const client of connectedClients) {
    // WSContext doesn't expose readyState directly in the same way as ServerWebSocket, 
    // but we can assume it's open if it's in the set, or try/catch send
    try {
        client.send(msgString);
    } catch (e) {
        connectedClients.delete(client);
    }
  }
};

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onOpen(event, ws) {
      logger.info('Client connected to notifications');
      connectedClients.add(ws);
      ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connected to Notification Service' }));
    },
    onClose(event, ws) {
      logger.info('Client disconnected from notifications');
      connectedClients.delete(ws);
    },
  };
}));

app.get('/health', (c) => c.json({ status: 'ok', service: 'notification' }));

const port = parseInt(process.env.PORT || '3006');

export default {
  port,
  fetch: app.fetch,
  websocket,
};
