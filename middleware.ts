import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession, clearSessionCookie } from '@/lib/session';

const apiRateLimitMap = new Map<string, { count: number; lastReset: number }>();

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const configuredBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (process.env.NODE_ENV === 'production' && configuredBaseUrl) {
    try {
      const canonical = new URL(configuredBaseUrl);
      const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const host = rawHost ? rawHost.split(',')[0].trim() : '';
      if (host && canonical.host && host !== canonical.host && (host === 'globalsecuresend.com' || host === `www.globalsecuresend.com`)) {
        const url = request.nextUrl.clone();
        url.protocol = canonical.protocol;
        url.host = canonical.host;
        const response = NextResponse.redirect(url, 308);
        response.headers.set('x-request-id', requestId);
        return applySecurityHeaders(response);
      }
    } catch {
    }
  }

  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  if (pathname.startsWith('/api/')) {
    const limit = 100;
    const windowMs = 60 * 1000;

    const existing = apiRateLimitMap.get(ip) || { count: 0, lastReset: Date.now() };
    if (Date.now() - existing.lastReset > windowMs) {
      existing.count = 0;
      existing.lastReset = Date.now();
    }
    if (existing.count >= limit) {
      const tooMany = new NextResponse('Too Many Requests', { status: 429 });
      tooMany.headers.set('x-request-id', requestId);
      return applySecurityHeaders(tooMany);
    }
    existing.count += 1;
    apiRateLimitMap.set(ip, existing);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('x-request-id', requestId);
    return applySecurityHeaders(response);
  }

  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/verify',
    '/claim',
    '/monitoring',
    '/',
  ];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  const session = await validateSession(request).catch(() => null);
  if (!session) {
    if (!isPublicPath) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      clearSessionCookie(response);
      response.headers.set('x-request-id', requestId);
      return applySecurityHeaders(response);
    }
  } else {
    requestHeaders.set('x-session-id', session.sessionId);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.role);
    requestHeaders.set('x-user-email', session.email);

    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      response.headers.set('x-request-id', requestId);
      return applySecurityHeaders(response);
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('x-request-id', requestId);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
