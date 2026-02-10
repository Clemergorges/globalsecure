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

    // Update User
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            kycStatus: status,
            kycLevel: status === 'APPROVED' ? 2 : 0,
        }
    });

    // Update Documents
    await prisma.kYCDocument.updateMany({
        where: { userId, status: 'PENDING' },
        data: {
            status: status,
            rejectionReason: status === 'REJECTED' ? rejectionReason : null,
            verifiedAt: new Date()
        }
    });

    // Notify User
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