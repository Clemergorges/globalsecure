import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    // Check admin
    const user = await prisma.user.findUnique({ where: { id: session?.userId } });
    const isUserAdmin = user?.email === process.env.ADMIN_EMAIL;

    if (!session || !isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const incidents = await prisma.auditLog.findMany({
      where: {
        action: 'SECURITY_INCIDENT'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, incidents });

  } catch (error) {
    console.error('Incidents fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}
