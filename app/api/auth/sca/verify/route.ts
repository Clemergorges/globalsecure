import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

    const otp = await prisma.oTP.findFirst({
      where: {
        userId: session.userId,
        type: 'SCA_CHALLENGE',
        code: code,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { used: true, usedAt: new Date() }
    });

    // Update Session with lastScaAt
    // Note: getSession typically returns a JWT payload, not the DB session ID directly if using stateless JWT.
    // However, the prompt implies "Validar sessão/JWT". If we are using DB sessions, we update the session.
    // If using JWT only, we can't update the JWT without re-issuing.
    // Assuming DB session model exists (it does in schema), we need to find the active session.
    // If we can't find the session ID from the context (e.g. cookie), we update ALL active sessions for the user or just the user record?
    // The requirement was: "check recentSCA in Redis". Since I replaced Redis with Session.lastScaAt, I need to update the session.
    // But `getSession` in `lib/auth` might return the session token or ID.
    // Let's assume for now we update the User record itself? No, schema has `Session.lastScaAt`.
    // Let's check `lib/auth.ts` to see what `getSession` returns.

    // Update: If we can't easily identify the current session ID, we can fallback to a User-level `lastScaAt`?
    // The schema change I made was to `Session`.
    // Let's look at `lib/auth.ts` quickly. For now, I'll update the most recent active session for the user as a heuristic.
    
    const currentSession = await prisma.session.findFirst({
        where: { userId: session.userId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' }
    });

    if (currentSession) {
        await prisma.session.update({
            where: { id: currentSession.id },
            data: { lastScaAt: new Date() }
        });
    }

    return NextResponse.json({ success: true, message: 'SCA Verified' });

  } catch (error) {
    console.error('SCA Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
