import { Hono } from 'hono';
import { logger } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';

initTelemetry('gateway-service');

const app = new Hono();

const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  campaign: process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3002',
  pledge: process.env.PLEDGE_SERVICE_URL || 'http://localhost:3003',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
};

app.use('*', async (c, next) => {
  logger.info(`[Gateway] ${c.req.method} ${c.req.url}`);
  await next();
});

const proxy = (serviceUrl: string) => async (c: any) => {
  const path = c.req.path.replace(/^\/api\/v1\/[^\/]+/, ''); // Strip prefix if needed, or just forward
  // Actually, let's just forward the path relative to the service root.
  // If request is /auth/login, we want to hit AUTH_SERVICE/auth/login.
  
  const url = `${serviceUrl}${c.req.path}`;
  const method = c.req.method;
  const headers = c.req.header();
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await c.req.blob();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    const resBody = await response.blob();
    return c.newResponse(resBody, response.status, response.headers);
  } catch (error) {
    logger.error(`Proxy error to ${url}`, error);
    return c.json({ error: 'Service Unavailable' }, 503);
  }
};

app.all('/auth/*', proxy(SERVICES.auth));
app.all('/campaigns/*', proxy(SERVICES.campaign));
app.all('/pledges/*', proxy(SERVICES.pledge));
app.all('/payments/*', proxy(SERVICES.payment));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/metrics', (c) => {
  return c.text(`# HELP gateway_service_up Gateway service is running
# TYPE gateway_service_up gauge
gateway_service_up 1
`);
});

export default {
  port: 8080,
  fetch: app.fetch,
};
