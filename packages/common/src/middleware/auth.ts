import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';

export interface JWTPayload {
  id: number;
  role: string;
  email?: string;
  iat?: number;
  exp?: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
export const jwtAuth = () => createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Missing authorization header' }, 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Invalid authorization format. Use: Bearer <token>' }, 401);
  }

  const token = authHeader.substring(7);

  if (!token) {
    return c.json({ error: 'Missing token' }, 401);
  }

  try {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return c.json({ error: 'Server configuration error' }, 500);
    }

    const payload = jwt.verify(token, secret) as JWTPayload;
    
    // Store user info in context for downstream handlers
    c.set('user', payload);
    
    await next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return c.json({ error: 'Token expired' }, 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    logger.error('JWT verification error', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
});

/**
 * Role-Based Access Control Middleware
 * Requires user to have specific role(s)
 */
export const requireRole = (...allowedRoles: string[]) => 
  createMiddleware(async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn(`Access denied for user ${user.id} with role ${user.role}. Required: ${allowedRoles.join(', ')}`);
      return c.json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: user.role 
      }, 403);
    }

    await next();
  });

/**
 * Optional JWT Authentication
 * Extracts user if token present but doesn't fail if missing
 */
export const optionalAuth = () => createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const payload = jwt.verify(token, secret) as JWTPayload;
        c.set('user', payload);
      }
    } catch (error) {
      // Silent fail for optional auth
      logger.warn('Optional auth token invalid', error);
    }
  }

  await next();
});
