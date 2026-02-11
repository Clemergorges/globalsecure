import { redis } from '@/lib/redis';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `rate_limit:${identifier}`;
  
  try {
    const requests = await redis.incr(key);
    
    if (requests === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    const ttl = await redis.ttl(key);
    
    return {
      success: requests <= limit,
      limit,
      remaining: Math.max(0, limit - requests),
      reset: Date.now() + (ttl * 1000),
    };
  } catch (error) {
    console.error('Rate Limit Error:', error);
    // Fail open (allow request) if Redis is down, or fail closed? 
    // Usually fail open to avoid downtime, but for security critical... 
    // Let's fail open but log error.
    return {
      success: true,
      limit,
      remaining: 1,
      reset: Date.now() + (windowSeconds * 1000),
    };
  }
}
