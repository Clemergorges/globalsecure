
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession, clearSessionCookie } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Note: CORS and other security headers are handled globally, but we'll manage auth here.
  const { pathname } = request.nextUrl;

  const publicPaths = [
    '/auth/login', 
    '/auth/register', 
    '/auth/verify', 
    '/api/auth',
    '/api/webhooks',
    '/claim',
    '/' // Landing page
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Try to validate the session
  const session = await validateSession(request);

  if (!session) {
    // Not authenticated
    if (!isPublicPath) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      clearSessionCookie(response); // Clear invalid cookie to prevent redirect loops
      return response;
    }
  } else {
    // Authenticated
    // Attach user info to headers for API routes and server components
    requestHeaders.set('x-session-id', session.sessionId);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.role);
    requestHeaders.set('x-user-email', session.email);

    // If a logged-in user tries to access login/register, redirect to dashboard
    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Continue the request with potentially modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // We want the middleware to run on almost every request,
  // so we exclude only static assets.
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
};
