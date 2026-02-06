
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sessions = await prisma.session.findMany({
      // @ts-ignore
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        country: true,
        createdAt: true,
        expiresAt: true
      }
    });

    // Mark current session
    const sessionsWithCurrent = sessions.map(s => ({
      ...s,
      // @ts-ignore
      isCurrent: s.token === session.token // Assuming session object has token or we can infer from cookie
    }));

    return NextResponse.json({ sessions: sessionsWithCurrent });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    const session = await getSession();
    // @ts-ignore
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      const { sessionId } = await req.json();
  
      await prisma.session.deleteMany({
        where: {
          id: sessionId,
          // @ts-ignore
          userId: session.userId // Ensure user owns the session
        }
      });
  
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
    }
}
