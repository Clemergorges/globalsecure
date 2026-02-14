import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { wallet: true }
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Sanitize
  const { passwordHash, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}