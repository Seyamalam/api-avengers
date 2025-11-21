import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger, jwtAuth, requireRole, validateEnv, validateJWTSecret, register, httpRequestCounter, httpRequestDuration } from '@careforall/common';
import { initTelemetry } from '@careforall/telemetry';

// Validate environment variables
validateEnv({
  required: ['JWT_SECRET'],
  optional: [
    'AUTH_SERVICE_URL',
    'CAMPAIGN_SERVICE_URL',
    'PLEDGE_SERVICE_URL',
    'PAYMENT_SERVICE_URL',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
  ],
});
validateJWTSecret();

initTelemetry('gateway-service');

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
  credentials: true,
}));

const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  campaign: process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:3002',
  pledge: process.env.PLEDGE_SERVICE_URL || 'http://localhost:3003',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
};

// Metrics middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  const route = c.req.path;
  const method = c.req.method;
  
  logger.info(`[Gateway] ${method} ${c.req.url}`);
  
  await next();
  
  const duration = (Date.now() - start) / 1000;
  const status = c.res.status.toString();
  
  httpRequestCounter.inc({ method, route, status, service: 'gateway' });
  httpRequestDuration.observe({ method, route, status, service: 'gateway' }, duration);
});

const proxy = (serviceUrl: string) => async (c: any) => {
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

// Public routes (no auth required)
app.post('/auth/register', proxy(SERVICES.auth));
app.post('/auth/login', proxy(SERVICES.auth));

// Public campaign viewing
app.get('/campaigns', proxy(SERVICES.campaign));
app.get('/campaigns/:id', proxy(SERVICES.campaign));

// Admin-only campaign management (POST, PUT, DELETE)
app.post('/campaigns', jwtAuth(), requireRole('admin'), proxy(SERVICES.campaign));
app.put('/campaigns/:id', jwtAuth(), requireRole('admin'), proxy(SERVICES.campaign));
app.delete('/campaigns/:id', jwtAuth(), requireRole('admin'), proxy(SERVICES.campaign));

// Protected routes - Require authentication
app.post('/pledges', jwtAuth(), proxy(SERVICES.pledge));
app.get('/pledges/:id', jwtAuth(), proxy(SERVICES.pledge));

// Payment webhooks - no auth (validated by idempotency)
app.post('/payments/webhook', proxy(SERVICES.payment));

// Payment processing - requires auth
app.post('/payments/authorize', jwtAuth(), proxy(SERVICES.payment));
app.post('/payments/capture', jwtAuth(), proxy(SERVICES.payment));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/metrics', async (c) => {
  const metrics = await register.metrics();
  c.header('Content-Type', register.contentType);
  return c.text(metrics);
});

export default {
  port: 8080,
  fetch: app.fetch,
};
