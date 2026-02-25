import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { revokeSession, clearSessionCookie } from '@/lib/session';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/logger';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-jwt-key-change-me');
const COOKIE_NAME = 'auth_token';

export async function POST(request: NextRequest) {
  const tokenValue = request.cookies.get(COOKIE_NAME)?.value;
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const method = request.method;
  const path = request.nextUrl.pathname;
  let userId: string | undefined = undefined;
  let sessionId: string | undefined = undefined;

  if (tokenValue) {
    try {
      const { payload } = await jwtVerify(tokenValue, JWT_SECRET);
      sessionId = payload.jti as string | undefined;
      if (sessionId) {
        revokeSession(sessionId).catch(console.error);
        const s = await prisma.session.findUnique({ where: { id: sessionId }, select: { userId: true } }).catch(() => null);
        userId = s?.userId || undefined;
      }
    } catch (e) {
    }
  }

  const response = NextResponse.json({ success: true, message: 'Logged out' });
  clearSessionCookie(response);

  logAudit({
    userId,
    action: 'LOGOUT',
    status: 'SUCCESS',
    ipAddress,
    userAgent,
    method,
    path,
    metadata: { sessionId: sessionId || null },
  });

  return response;
}
