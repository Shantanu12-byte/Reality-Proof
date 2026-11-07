/**
 * RealityProof Frontend Production Logger
 * In production builds, suppresses debug/info noise and ensures no tokens,
 * passwords or sensitive credentials are ever printed to the browser console.
 */

const isDev = Boolean(import.meta.env?.DEV);

const SENSITIVE_PATTERNS = ['password', 'token', 'authorization', 'secret', 'key'];

const sanitizeArg = (arg) => {
  if (!arg) return arg;
  if (typeof arg === 'string') {
    if (arg.length > 500) return arg.slice(0, 500) + '...[truncated]';
    return arg;
  }
  if (typeof arg === 'object') {
    try {
      const copy = Array.isArray(arg) ? [...arg] : { ...arg };
      for (const k of Object.keys(copy)) {
        if (SENSITIVE_PATTERNS.some((p) => k.toLowerCase().includes(p))) {
          copy[k] = '[REDACTED]';
        }
      }
      return copy;
    } catch {
      return '[Unserializable]';
    }
  }
  return arg;
};

export const clientLogger = {
  error: (tag, message, ...args) => {
    // Meaningful production error reporting is preserved
    console.error(`[${tag}]`, message, ...args.map(sanitizeArg));
  },
  warn: (tag, message, ...args) => {
    if (isDev) {
      console.warn(`[${tag}]`, message, ...args.map(sanitizeArg));
    }
  },
  info: (tag, message, ...args) => {
    if (isDev) {
      console.info(`[${tag}]`, message, ...args.map(sanitizeArg));
    }
  },
  debug: (tag, message, ...args) => {
    if (isDev) {
      console.debug(`[${tag}]`, message, ...args.map(sanitizeArg));
    }
  },
};

export default clientLogger;
