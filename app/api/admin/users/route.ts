import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        wallet: {
            include: {
                balances: true
            }
        },
        kycDocuments: {
            orderBy: { createdAt: 'desc' },
            take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Sanitize sensitive data
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      kycStatus: user.kycStatus,
      kycLevel: user.kycLevel,
      wallet: user.wallet,
      lastKycDoc: user.kycDocuments[0] || null,
      createdAt: user.createdAt
    }));

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Admin Users Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}