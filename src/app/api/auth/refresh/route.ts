import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { validateSession, revokeSession, createSession, setSessionCookie } from '@/lib/session';
import { logAudit } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const session = await validateSession(request);
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const method = request.method;
  const path = request.nextUrl.pathname;

  if (!session) {
    logAudit({ action: 'SESSION_REFRESH', status: 'FAILURE', ipAddress, userAgent, method, path, metadata: { reason: 'UNAUTHORIZED' } });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await revokeSession(session.sessionId);

  const { token, maxAgeSeconds } = await createSession({ id: session.userId, role: session.role }, ipAddress, userAgent);

  const response = NextResponse.json({ success: true });
  setSessionCookie(response, token, maxAgeSeconds);
  logAudit({ userId: session.userId, action: 'SESSION_REFRESH', status: 'SUCCESS', ipAddress, userAgent, method, path, metadata: { rotated: true } });
  return response;
}
