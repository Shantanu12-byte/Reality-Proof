/**
 * RealityProof Production-Ready Structured Logger
 * Enforces log levels, sanitizes sensitive fields (tokens, secrets, passwords),
 * and prevents verbose console pollution in production.
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const isProduction = process.env.NODE_ENV === 'production';
const currentLevel = isProduction ? LOG_LEVELS.info : LOG_LEVELS.debug;

const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'client_secret',
  'paypal_client_secret',
  'cookie',
  'jwt',
];

/**
 * Recursively sanitize an object to mask sensitive credentials
 */
const sanitize = (data) => {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const formatMessage = (level, context, message, meta) => {
  const timestamp = new Date().toISOString();
  const ctx = context ? `[${context}] ` : '';
  const metaStr = meta ? ` ${JSON.stringify(sanitize(meta))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${ctx}${message}${metaStr}`;
};

export const logger = {
  error: (context, message, meta) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', context, message, meta));
    }
  },
  warn: (context, message, meta) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', context, message, meta));
    }
  },
  info: (context, message, meta) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.info(formatMessage('info', context, message, meta));
    }
  },
  debug: (context, message, meta) => {
    if (currentLevel >= LOG_LEVELS.debug && !isProduction) {
      console.debug(formatMessage('debug', context, message, meta));
    }
  },
};

export default logger;
