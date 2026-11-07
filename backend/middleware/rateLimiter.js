/**
 * RealityProof Lightweight In-Memory Rate Limiter Middleware
 * Protects authentication endpoints against brute-force attacks and credential stuffing.
 */

class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 15) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Periodically clean up stale entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.hits.entries()) {
      if (now - record.startTime > this.windowMs) {
        this.hits.delete(key);
      }
    }
  }

  middleware(customMessage = 'Too many authentication attempts. Please try again later.') {
    return (req, res, next) => {
      // In development tests, allow high threshold or bypass if automated suite header
      if (req.headers['x-test-bypass-rate-limit'] && process.env.NODE_ENV !== 'production') {
        return next();
      }

      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'anonymous';
      const key = `${req.baseUrl || req.path}-${clientIp}`;
      const now = Date.now();

      let record = this.hits.get(key);

      if (!record || now - record.startTime > this.windowMs) {
        record = { count: 1, startTime: now };
        this.hits.set(key, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetTimeSeconds = Math.ceil((record.startTime + this.windowMs - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTimeSeconds);

      if (record.count > this.maxRequests) {
        res.setHeader('Retry-After', resetTimeSeconds);
        return res.status(429).json({
          success: false,
          error: 'RateLimitExceeded',
          message: customMessage,
          retryAfterSeconds: resetTimeSeconds,
        });
      }

      next();
    };
  }
}

// Dedicated Auth Rate Limiter: Max 30 attempts per 15 minutes per IP
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 30).middleware(
  'Too many login attempts from this network. For security, please wait a few minutes before trying again.'
);

export default authRateLimiter;
