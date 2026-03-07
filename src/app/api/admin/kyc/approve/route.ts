import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAdmin } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, status, rejectionReason } = await req.json();

    if (!userId || !['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // All KYC-related DB updates in a single transaction (User, Documents, KycVerification, Account)
    await prisma.$transaction(async (tx) => {
      // Update User
      await tx.user.update({
        where: { id: userId },
        data: {
          kycStatus: status,
          kycLevel: status === 'APPROVED' ? 2 : 0,
        },
      });

      // Update Documents
      await tx.kYCDocument.updateMany({
        where: { userId, status: 'PENDING' },
        data: {
          status: status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          verifiedAt: new Date(),
        },
      });

      // Update KycVerification (New Model)
      await tx.kycVerification.upsert({
        where: { userId },
        update: {
          status: status,
          level: status === 'APPROVED' ? 'ADVANCED' : 'BASIC',
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          approvedAt: status === 'APPROVED' ? new Date() : null,
        },
        create: {
          userId,
          status: status,
          level: status === 'APPROVED' ? 'ADVANCED' : 'BASIC',
          approvedAt: status === 'APPROVED' ? new Date() : null,
        },
      });

      // When KYC is approved, set Account to ACTIVE so user is no longer redirected to onboarding
      if (status === 'APPROVED') {
        await tx.account.update({
          where: { userId },
          data: { status: 'ACTIVE' },
        });
      }
    });

    // Notify User (outside transaction so notification failure does not rollback KYC)
    await createNotification({
        userId,
        title: status === 'APPROVED' ? 'Conta Verificada! 🎉' : 'Verificação Falhou ⚠️',
        body: status === 'APPROVED' 
            ? 'Sua conta foi verificada com sucesso. Seus limites foram aumentados.'
            : `Sua verificação foi rejeitada. Motivo: ${rejectionReason || 'Documentos ilegíveis'}. Tente novamente.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'ERROR'
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin KYC Error:', error);
    return NextResponse.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}