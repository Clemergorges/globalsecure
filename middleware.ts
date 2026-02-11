import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/navigation';

// 1. Configuração do i18n Middleware
const intlMiddleware = createMiddleware(routing);

// Simple in-memory rate limiter (not suitable for serverless/distributed, but works for containerized)
// For scalable solution, use Redis/Upstash
const rateLimitMap = new Map();

export default function middleware(request: NextRequest) {
  // 1. Rate Limiting
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  
  // Base limits
  let limit = process.env.NODE_ENV === 'development' ? 5000 : 1000; 
  const windowMs = 60 * 1000; // 1 minute

  // Sensitive Routes Limits (Stricter)
  const { pathname } = request.nextUrl;
  if (
    pathname.includes('/api/auth/login') || 
    pathname.includes('/api/auth/register') ||
    pathname.includes('/api/cards/claim') ||
    pathname.includes('/api/cards/unlock') ||
    pathname.includes('/api/transfers/create')
  ) {
    limit = process.env.NODE_ENV === 'development' ? 100 : 10; // 10 requests per minute for sensitive actions
  }

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

  // 2. Executa o Middleware do next-intl
  // Ele vai processar a rota e retornar a resposta adequada (redirecionamento ou renderização)
  const response = intlMiddleware(request);

  // 2.1 Auth Protection (Restaurada)
  // Protege rotas sensíveis contra acesso não autenticado
  const token = request.cookies.get('token')?.value;
  // const { pathname } = request.nextUrl; // Already declared above
  
  // Normaliza o pathname removendo o locale (ex: /pt/dashboard -> /dashboard)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|pt|es|de|fr)/, '');

  const isProtectedRoute = 
    pathnameWithoutLocale.startsWith('/dashboard') || 
    pathnameWithoutLocale.startsWith('/admin');

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    // Preserva o locale se possível, senão vai para o default
    const locale = pathname.split('/')[1] || 'pt';
    loginUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(loginUrl);
  }

  // 3. Security Headers (Helmet-like)
  // Adiciona headers de segurança na resposta gerada pelo next-intl
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://js.pusher.com https://*.pusher.com;
    connect-src 'self' wss://*.pusher.com https://*.pusher.com https://sockjs-eu.pusher.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.stripe.com;
    font-src 'self' https://r2cdn.perplexity.ai;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  // Matcher deve ignorar rotas internas (_next, api, static files)
  // Mas deve capturar a raiz / e rotas de app
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
