const REQUIRED_RUNTIME_KEYS = [
  'NODE_ENV',
  'PORT',
  'HOST',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'DATABASE_SYNCHRONIZE',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRATION',
  'JWT_REFRESH_EXPIRATION',
  'FRONTEND_URL',
] as const;

const WEAK_SECRET_MARKERS = [
  'secret',
  'password',
  'changeme',
  'change-this',
  'replace-with',
  'not-configured',
];

function requireValue(config: Record<string, unknown>, key: string) {
  const value = config[key];

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${key} environment variable is required.`);
  }

  return value.trim();
}

function validateUrl(value: string, key: string) {
  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error(`${key} must be a valid HTTP(S) URL.`);
  }
}

function validateInteger(value: string, key: string) {
  if (!Number.isInteger(Number(value))) {
    throw new Error(`${key} must be a valid integer.`);
  }
}

function validateJwtSecret(value: string, key: string, isProduction: boolean) {
  const normalized = value.toLowerCase();

  if (isProduction) {
    if (WEAK_SECRET_MARKERS.some((marker) => normalized.includes(marker))) {
      throw new Error(`${key} must not use a placeholder or weak value.`);
    }

    if (value.length < 32) {
      throw new Error(`${key} must be at least 32 characters in production.`);
    }
  }
}

export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv =
    typeof config.NODE_ENV === 'string' && config.NODE_ENV.trim()
      ? config.NODE_ENV.trim()
      : 'development';
  const isTest = nodeEnv === 'test';
  const isProduction = nodeEnv === 'production';

  if (isTest) {
    return { ...config, NODE_ENV: nodeEnv };
  }

  for (const key of REQUIRED_RUNTIME_KEYS) {
    requireValue(config, key);
  }

  validateInteger(requireValue(config, 'PORT'), 'PORT');
  validateInteger(requireValue(config, 'DATABASE_PORT'), 'DATABASE_PORT');
  validateUrl(requireValue(config, 'FRONTEND_URL'), 'FRONTEND_URL');

  if (
    typeof config.FRONTEND_RESET_PASSWORD_URL === 'string' &&
    config.FRONTEND_RESET_PASSWORD_URL.trim()
  ) {
    validateUrl(
      config.FRONTEND_RESET_PASSWORD_URL.trim(),
      'FRONTEND_RESET_PASSWORD_URL',
    );
  }
  validateJwtSecret(
    requireValue(config, 'JWT_ACCESS_SECRET'),
    'JWT_ACCESS_SECRET',
    isProduction,
  );
  validateJwtSecret(
    requireValue(config, 'JWT_REFRESH_SECRET'),
    'JWT_REFRESH_SECRET',
    isProduction,
  );

  const synchronize = requireValue(
    config,
    'DATABASE_SYNCHRONIZE',
  ).toLowerCase();

  if (!['true', 'false'].includes(synchronize)) {
    throw new Error('DATABASE_SYNCHRONIZE must be either "true" or "false".');
  }

  if (isProduction && synchronize === 'true') {
    throw new Error('DATABASE_SYNCHRONIZE must be false in production.');
  }

  const allowedOrigins =
    typeof config.ALLOWED_ORIGINS === 'string' && config.ALLOWED_ORIGINS.trim()
      ? config.ALLOWED_ORIGINS
      : config.FRONTEND_URL;

  if (typeof allowedOrigins !== 'string' || allowedOrigins.includes('*')) {
    throw new Error('Wildcard CORS origins are not allowed.');
  }

  return { ...config, NODE_ENV: nodeEnv };
}
