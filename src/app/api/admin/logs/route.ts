
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // Ensure only admins can access logs
    await checkAdmin();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true }
          }
        }
      }),
      prisma.auditLog.count()
    ]);

    return NextResponse.json({ logs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Unauthorized or Internal Error' }, { status: 403 });
  }
}
