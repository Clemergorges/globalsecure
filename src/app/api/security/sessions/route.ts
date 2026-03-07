
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { inferDeviceTypeFromUserAgent } from '@/lib/device';

type SessionRow = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastScaAt: Date | null;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string' || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sessions: SessionRow[] = await prisma.session.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        country: true,
        createdAt: true,
        expiresAt: true,
        lastScaAt: true
      }
    });

    const currentSessionId = session.sessionId || null;
    const sessionsWithCurrent = sessions.map((s) => {
      const lastActive = (s.lastScaAt ?? s.createdAt).toISOString();
      return {
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        country: s.country,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        lastActive,
        deviceType: inferDeviceTypeFromUserAgent(s.userAgent),
        location: s.country || null,
        isCurrent: currentSessionId ? s.id === currentSessionId : false,
      };
    });

    return NextResponse.json({ sessions: sessionsWithCurrent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    const session = await getSession();
    if (!session || typeof session === 'string' || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      const { sessionId } = await req.json();
  
      await prisma.session.deleteMany({
        where: {
          id: sessionId,
          userId: session.userId // Ensure user owns the session
        }
      });
  
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
    }
}
