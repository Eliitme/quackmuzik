import { logger } from './logger';

/**
 * Validate and warn about environment variables
 * Checks for required env vars and warns if using default values in production
 */
export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const warnings: string[] = [];
  const errors: string[] = [];

  // Required environment variables (no defaults allowed in production)
  const requiredVars = [
    {
      name: 'DISCORD_TOKEN',
      value: process.env.DISCORD_TOKEN,
      description: 'Discord bot token',
    },
    {
      name: 'DISCORD_CLIENT_ID',
      value: process.env.DISCORD_CLIENT_ID,
      description: 'Discord client ID',
    },
  ];

  // Environment variables with defaults (warn if using defaults in production)
  const defaultVars = [
    {
      name: 'LAVALINK_PASSWORD',
      value: process.env.LAVALINK_PASSWORD,
      defaultValue: 'youshallnotpass',
      description: 'Lavalink server password',
    },
    {
      name: 'DB_PASSWORD',
      value: process.env.DB_PASSWORD,
      defaultValue: 'postgres',
      description: 'Database password',
    },
    {
      name: 'DB_HOST',
      value: process.env.DB_HOST,
      defaultValue: 'localhost',
      description: 'Database host',
    },
    {
      name: 'DB_USER',
      value: process.env.DB_USER,
      defaultValue: 'postgres',
      description: 'Database user',
    },
  ];

  // Check required variables
  for (const envVar of requiredVars) {
    if (!envVar.value || envVar.value.trim() === '') {
      errors.push(`Missing required environment variable: ${envVar.name} (${envVar.description})`);
    }
  }

  // Check default variables (warn in production)
  if (isProduction) {
    for (const envVar of defaultVars) {
      if (!envVar.value || envVar.value === envVar.defaultValue) {
        warnings.push(
          `Using default value for ${envVar.name} (${envVar.description}). This is not recommended for production!`
        );
      }
    }
  }

  // Log errors
  if (errors.length > 0) {
    logger.error('Environment validation failed', { errors });
    throw new Error(`Missing required environment variables: ${errors.join(', ')}`);
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment validation warnings', { warnings });
    for (const warning of warnings) {
      logger.warn(warning);
    }
  }

  if (isProduction && warnings.length === 0 && errors.length === 0) {
    logger.info('Environment validation passed - all required variables are set');
  }
}
