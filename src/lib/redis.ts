import { createClient } from 'redis';

// Standard Node.js Redis Client (Not for Edge)
// Use in Route Handlers / Server Actions

const globalForRedis = globalThis as unknown as {
  redis?: ReturnType<typeof createClient>;
  redisConnect?: Promise<unknown>;
};

const redisUrl = process.env.REDIS_URL;
const shouldConnect = Boolean(redisUrl && !redisUrl.includes('mock'));

const redis = globalForRedis.redis || createClient({
  url: redisUrl || 'redis://localhost:6379',
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
if (!globalForRedis.redis) globalForRedis.redis = redis;

export async function ensureRedisConnected() {
  if (!shouldConnect) return false;
  if (redis.isOpen) return true;
  if (!globalForRedis.redisConnect) {
    globalForRedis.redisConnect = redis.connect().catch((err) => {
      globalForRedis.redisConnect = undefined;
      throw err;
    });
  }
  try {
    await globalForRedis.redisConnect;
    return redis.isOpen;
  } catch {
    return false;
  }
}

export { redis };
