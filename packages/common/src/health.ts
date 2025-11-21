import Redis from 'ioredis';
import { sql } from 'drizzle-orm';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  checks: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
}

/**
 * Comprehensive health check that verifies all dependencies
 */
export async function performHealthCheck(
  serviceName: string,
  checks: {
    database?: boolean;
    redis?: boolean;
    nats?: boolean;
  } = {}
): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: serviceName,
    checks: {},
  };

  // Check Database
  if (checks.database) {
    const dbStart = Date.now();
    try {
      // Import db dynamically to avoid circular dependencies
      const { db } = await import('@careforall/db');
      await db.execute(sql`SELECT 1`);
      result.checks.database = {
        status: 'up',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      result.checks.database = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      result.status = 'unhealthy';
    }
  }

  // Check Redis
  if (checks.redis) {
    const redisStart = Date.now();
    let redis: Redis | undefined;
    try {
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        connectTimeout: 2000,
      });
      await redis.connect();
      await redis.ping();
      result.checks.redis = {
        status: 'up',
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      result.checks.redis = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    } finally {
      await redis?.quit();
    }
  }

  // Check NATS
  if (checks.nats) {
    const natsStart = Date.now();
    try {
      // Import natsClient dynamically
      const { natsClient } = await import('@careforall/events');
      // Check if NATS client is connected
      if (natsClient && (natsClient as any).nc) {
        result.checks.nats = {
          status: 'up',
          latency: Date.now() - natsStart,
        };
      } else {
        result.checks.nats = {
          status: 'down',
          error: 'NATS client not connected',
        };
        result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
    } catch (error) {
      result.checks.nats = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  return result;
}

/**
 * Simple health check for basic uptime monitoring
 */
export function simpleHealthCheck(serviceName: string): HealthCheckResult {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: serviceName,
    checks: {
      uptime: {
        status: 'up',
        latency: process.uptime(),
      },
    },
  };
}
