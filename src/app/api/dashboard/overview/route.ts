import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { validateSession } from '@/lib/session';
import { logAudit } from '@/lib/logger';
import { getUserOverview } from '@/lib/services/userOverview';

export async function GET(req: NextRequest) {
  const session = await validateSession(req);
  if (!session) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role !== UserRole.END_USER) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });

  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const method = req.method;
  const path = req.nextUrl.pathname;

  try {
    const data = await getUserOverview(session.userId);
    return NextResponse.json({ data, meta: { generatedAt: new Date().toISOString() } });
  } catch (e: any) {
    logAudit({
      userId: session.userId,
      action: 'DASHBOARD_OVERVIEW',
      status: 'FAILURE',
      ipAddress,
      userAgent,
      method,
      path,
      metadata: { reason: e?.message || 'UNKNOWN' },
    });
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

