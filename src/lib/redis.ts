import { createClient } from 'redis';

// Standard Node.js Redis Client (Not for Edge)
// Use in Route Handlers / Server Actions

const globalForRedis = global as unknown as { redis: ReturnType<typeof createClient> };

const redis = globalForRedis.redis || createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      // Don't retry indefinitely during build/CI
      if (process.env.NODE_ENV === 'test' || process.env.CI) {
        return retries > 2 ? new Error('Redis connection failed in test/CI') : 100;
      }
      if (retries > 10) {
        console.warn('Redis reconnection retries exhausted. Rate limiting might be unavailable.');
        return new Error('Redis reconnection retries exhausted');
      }
      return Math.min(retries * 50, 2000);
    }
  }
});

redis.on('error', (err) => {
    // Suppress connection refused errors in dev to allow app to run without Redis
    if (err.code === 'ECONNREFUSED') {
        // console.warn('Redis connection failed (ECONNREFUSED). Ensure Redis is running.');
        // Don't log stack trace for this common dev issue
    } else {
        console.error('Redis Client Error', err.message);
    }
});

// Connect only if not already connected
if (!redis.isOpen) {
  // Prevent connection during build time if REDIS_URL is not set or mock
  const shouldConnect = process.env.REDIS_URL && !process.env.REDIS_URL.includes('mock');
  
  if (shouldConnect) {
    redis.connect().catch((err) => {
        if (err.code !== 'ECONNREFUSED') console.error('Redis Connect Error', err.message);
    });
  }
}

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export { redis };
