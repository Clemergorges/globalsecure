
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-me';

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // 1. CORS Policy
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3012',
    'http://localhost:3000',
    'https://app.globalsecuresend.com',
    'https://globalsecuresend.com'
  ];
  
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    return response;
  }

  // 2. Authentication & Account Status Check
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Define public paths that don't require auth
  const publicPaths = [
    '/auth/login', 
    '/auth/register', 
    '/auth/verify', 
    '/api/auth',
    '/api/claim/',
    '/api/webhooks',
    '/claim',
    '/' // Landing page
  ];

  // Define onboarding paths
  const onboardingPaths = ['/onboarding'];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isOnboardingPath = onboardingPaths.some(path => pathname.startsWith(path));

  // If user is logged in
  if (token) {
    try {
      const { payload } = await jose.jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      );

      const accountStatus = payload.status as string; // 'UNVERIFIED', 'PENDING', 'ACTIVE', 'FROZEN'

      // Logic: If status is UNVERIFIED or PENDING, force to Onboarding
      // Unless already on onboarding path or calling onboarding API
      const isOnboardingAPI = pathname.startsWith('/api/onboarding');
      
      if (
        (accountStatus === 'UNVERIFIED' || accountStatus === 'PENDING') &&
        !isOnboardingPath && 
        !isOnboardingAPI &&
        !pathname.startsWith('/auth/logout') // Allow logout
      ) {
        // Allow access to public pages? Maybe not dashboard.
        if (pathname.startsWith('/dashboard')) {
            return NextResponse.redirect(new URL('/onboarding/personal', request.url));
        }
      }

      // If status is ACTIVE, block access to Onboarding (except status page?)
      if (accountStatus === 'ACTIVE' && isOnboardingPath && !pathname.includes('/status')) {
         return NextResponse.redirect(new URL('/dashboard', request.url));
      }

    } catch (err) {
      // Invalid token, treat as logged out
      if (!isPublicPath) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
    }
  } else {
    // Not logged in
    if (!isPublicPath) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // 3. Process Request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 4. Security Headers
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.stripe.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', "camera=(), microphone=(), geolocation=()");

  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
