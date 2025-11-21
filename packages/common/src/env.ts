import { logger } from './logger';

export interface EnvConfig {
  required: string[];
  optional?: string[];
}

/**
 * Validates that all required environment variables are set
 * @param config Configuration specifying required and optional env vars
 * @throws Error if any required variables are missing
 */
export function validateEnv(config: EnvConfig): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of config.required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional variables (just warn)
  if (config.optional) {
    for (const varName of config.optional) {
      if (!process.env[varName]) {
        warnings.push(varName);
      }
    }
  }

  // Log warnings for optional missing vars
  if (warnings.length > 0) {
    logger.warn(`Optional environment variables not set: ${warnings.join(', ')}`);
  }

  // Throw error if required vars are missing
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  logger.info(`Environment validation passed. All required variables present.`);
}

/**
 * Get environment variable with type safety and default value
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and no default provided`);
  }
  return value;
}

/**
 * Get required environment variable (throws if not set)
 */
export function getRequiredEnv(key: string): string {
  return getEnv(key);
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return getEnv(key, defaultValue);
}

/**
 * Validate JWT_SECRET specifically (security-critical)
 */
export function validateJWTSecret(): void {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET must be set');
  }

  if (secret === 'secret' || secret === 'your-secret-key-change-in-production') {
    logger.warn('⚠️  WARNING: Using default JWT_SECRET. This is INSECURE for production!');
  }

  if (secret.length < 32) {
    logger.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters for security');
  }
}
