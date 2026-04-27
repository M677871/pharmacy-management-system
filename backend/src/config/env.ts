import { ConfigService } from '@nestjs/config';

type OriginCallback = (error: Error | null, allow?: boolean) => void;

export function getRequiredString(
  config: ConfigService,
  key: string,
) {
  const value = config.get<string>(key);

  if (value?.trim()) {
    return value.trim();
  }

  throw new Error(`${key} environment variable is required.`);
}

export function getRequiredNumber(
  config: ConfigService,
  key: string,
) {
  const rawValue = getRequiredString(config, key);
  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid number.`);
  }

  return value;
}

export function parseBooleanConfig(value: string, key: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error(`${key} must be either "true" or "false".`);
}

function parseAllowedOrigins(rawValue: string) {
  const origins = rawValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins.length) {
    throw new Error('ALLOWED_ORIGINS or FRONTEND_URL must be configured.');
  }

  if (origins.includes('*')) {
    throw new Error('Wildcard CORS origins are not allowed.');
  }

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error(`Invalid allowed origin configured: ${origin}`);
    }
  }

  return origins;
}

export function getAllowedOriginsFromConfig(config: ConfigService) {
  const configuredOrigins = config.get<string>('ALLOWED_ORIGINS');
  const frontendUrl = config.get<string>('FRONTEND_URL');
  const rawOrigins = configuredOrigins?.trim() ? configuredOrigins : frontendUrl;

  if (!rawOrigins?.trim()) {
    throw new Error('ALLOWED_ORIGINS or FRONTEND_URL must be configured.');
  }

  return parseAllowedOrigins(rawOrigins);
}

export function getAllowedOriginsFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const rawOrigins = env.ALLOWED_ORIGINS?.trim()
    ? env.ALLOWED_ORIGINS
    : env.FRONTEND_URL;

  if (!rawOrigins?.trim()) {
    throw new Error('ALLOWED_ORIGINS or FRONTEND_URL must be configured.');
  }

  return parseAllowedOrigins(rawOrigins);
}

function createOriginValidator(resolveAllowedOrigins: () => string[]) {
  return (origin: string | undefined, callback: OriginCallback) => {
    try {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, resolveAllowedOrigins().includes(origin));
    } catch (error) {
      callback(error instanceof Error ? error : new Error('Invalid CORS config.'));
    }
  };
}

export function buildHttpCorsOptions(config: ConfigService) {
  return {
    origin: createOriginValidator(() => getAllowedOriginsFromConfig(config)),
    credentials: true,
  };
}

export function buildSocketCorsOptions() {
  return {
    origin: createOriginValidator(() => getAllowedOriginsFromEnv()),
    credentials: true,
  };
}
