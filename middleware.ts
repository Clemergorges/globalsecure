import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (not suitable for serverless/distributed, but works for containerized)
// For scalable solution, use Redis/Upstash
const rateLimitMap = new Map();

export function middleware(request: NextRequest) {
  // 1. Rate Limiting
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const limit = 100; // 100 requests
  const windowMs = 60 * 1000; // 1 minute

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 0, lastReset: Date.now() });
  }

  const ipData = rateLimitMap.get(ip);

  if (Date.now() - ipData.lastReset > windowMs) {
    ipData.count = 0;
    ipData.lastReset = Date.now();
  }

  if (ipData.count >= limit) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  ipData.count += 1;

  // 2. CORS (Optional - usually handled by next.config.js or vercel.json)
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY'); // Clickjacking protection
  response.headers.set('X-Content-Type-Options', 'nosniff'); // MIME sniffing protection
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
