
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const approveSchema = z.object({
  targetUserId: z.string(),
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional()
});

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // In a real app, check for ADMIN role
  // if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { targetUserId, action, reason } = approveSchema.parse(body);

    if (action === 'APPROVE') {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          kycStatus: 'APPROVED',
          kycLevel: 2 // Full access
        }
      });
      
      // Update latest document status
      const lastDoc = await prisma.kYCDocument.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' }
      });

      if (lastDoc) {
        await prisma.kYCDocument.update({
          where: { id: lastDoc.id },
          data: { status: 'APPROVED', verifiedAt: new Date() }
        });
      }

    } else {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          kycStatus: 'REJECTED',
          kycLevel: 0
        }
      });

      const lastDoc = await prisma.kYCDocument.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' }
      });

      if (lastDoc) {
        await prisma.kYCDocument.update({
          where: { id: lastDoc.id },
          data: { status: 'REJECTED', rejectionReason: reason || 'Documents do not match criteria' }
        });
      }
    }

    return NextResponse.json({ success: true, action });

  } catch (error) {
    return NextResponse.json({ error: 'Admin action failed' }, { status: 500 });
  }
}
