import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { validateSession } from '@/lib/session';
import { buildMoneyPathTimeline } from '@/lib/services/money-path-timeline';

function isDemoEnabled() {
  if (process.env.DEMO_MODE_ENABLED === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ transferId: string }> }) {
  if (!isDemoEnabled()) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  const session = await validateSession(req);
  if (!session) return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
  if (session.role !== UserRole.END_USER) return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });

  const { transferId } = await params;
  try {
    const timeline = await buildMoneyPathTimeline({ userId: session.userId, transferId });
    return NextResponse.json({ data: timeline });
  } catch (e: any) {
    const msg = String(e?.message || 'UNKNOWN');
    if (msg === 'TRANSFER_NOT_FOUND') return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    return NextResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

