import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // @ts-ignore
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: session.userId },
    include: { wallet: true }
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return NextResponse.json({ user: userWithoutPassword });
}
