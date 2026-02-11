import { createClient } from 'redis';

// Standard Node.js Redis Client (Not for Edge)
// Use in Route Handlers / Server Actions
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.warn('Redis reconnection retries exhausted. Rate limiting might be unavailable.');
        return new Error('Redis reconnection retries exhausted');
      }
      return Math.min(retries * 50, 500);
    }
  }
});

redis.on('error', (err) => {
    // Suppress connection refused errors in dev to allow app to run without Redis
    if (err.code === 'ECONNREFUSED') {
        // console.warn('Redis connection failed (ECONNREFUSED). Ensure Redis is running.');
        // Don't log stack trace for this common dev issue
    } else {
        console.error('Redis Client Error', err);
    }
});

if (!redis.isOpen) {
  redis.connect().catch((err) => {
      if (err.code !== 'ECONNREFUSED') console.error('Redis Connect Error', err);
  });
}

export { redis };
