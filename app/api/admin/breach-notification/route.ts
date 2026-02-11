import { NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth'; // Assume isAdmin helper exists or check email
import { breachNotificationService } from '@/lib/services/breach-notification';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    // Check admin
    const user = await prisma.user.findUnique({ where: { id: session?.userId } });
    const isUserAdmin = user?.email === process.env.ADMIN_EMAIL;

    if (!session || !isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      type, 
      severity, 
      description, 
      affectedSystems, 
      affectedDataTypes,
      occurredAt,
      discoveredAt
    } = body;

    const incident = {
      id: `INC-${Date.now()}`,
      type,
      severity,
      description,
      affectedSystems,
      affectedDataTypes,
      occurredAt: new Date(occurredAt),
      discoveredAt: new Date(discoveredAt),
      affectedUserIds: [] // Can be populated if specific users are known
    };

    const assessment = await breachNotificationService.detectBreach(incident);

    return NextResponse.json({ success: true, assessment });

  } catch (error) {
    console.error('Breach notification error:', error);
    return NextResponse.json({ error: 'Failed to process breach notification' }, { status: 500 });
  }
}
