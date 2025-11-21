import { createMiddleware } from 'hono/factory';
import Redis from 'ioredis';

let redis: Redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redis;
}

export const idempotency = (keySelector?: (c: any) => string | undefined) => createMiddleware(async (c, next) => {
  const idempotencyKey = keySelector ? keySelector(c) : c.req.header('x-idempotency-key');

  if (!idempotencyKey) {
    await next();
    return;
  }

  const redisClient = getRedis();
  const key = `idempotency:${idempotencyKey}`;
  const cachedResponse = await redisClient.get(key);

  if (cachedResponse) {
    const { status, body, headers } = JSON.parse(cachedResponse);
    return c.newResponse(body, status, headers);
  }

  await next();

  // Cache the response
  const responseBody = await c.res.clone().text();
  const responseData = {
    status: c.res.status,
    body: responseBody,
    headers: Object.fromEntries(c.res.headers.entries()),
  };

  // Expire in 24 hours
  await redisClient.set(key, JSON.stringify(responseData), 'EX', 60 * 60 * 24);
});
