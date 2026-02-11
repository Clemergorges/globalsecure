import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.userId;

    // 1. Verificar obrigações legais de retenção
    const hasPendingTransactions = await prisma.transfer.findFirst({
      where: {
        OR: [
          { senderId: userId, status: 'PENDING' },
          { receiverId: userId, status: 'PENDING' }
        ]
      }
    });

    const hasPendingCards = await prisma.virtualCard.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      }
    });

    const hasKYCRequirements = await prisma.kYCDocument.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (hasPendingTransactions || hasPendingCards) {
      logger.info('Account deletion blocked due to pending transactions/cards', { userId });
      return NextResponse.json({ 
        error: 'Conta não pode ser excluída devido a transações ou cartões ativos',
        details: 'Por favor, aguarde a conclusão de todas as transações pendente e cancele cartões ativos',
        retentionPeriod: '7 anos' // Período legal de retenção KYC/AML
      }, { status: 400 });
    }

    // 2. Buscar dados do usuário para anonimização
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 3. Registrar operação de exclusão
    logger.info('Starting account deletion process', { 
      userId, 
      email: user.email,
      reason: 'User requested account deletion under GDPR Article 17'
    });

    // 4. Anonimizar dados pessoais
    const anonymizedEmail = `deleted_${userId}_${Date.now()}@anonymized.local`;
    const anonymizedPhone = `000000000`;
    const anonymizedName = `Deleted User ${userId.slice(-8)}`;

    await prisma.$transaction(async (tx) => {
      // Atualizar dados do usuário para versão anonimizada
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          firstName: anonymizedName,
          lastName: '',
          phone: anonymizedPhone,
          gdprConsent: false,
          gdprConsentAt: null,
          emailVerified: false,
          phoneVerified: false,
          kycStatus: 'REJECTED' // Invalidar KYC
        }
      });

      // Anonimizar dados de KYC
      await tx.kYCDocument.updateMany({
        where: { userId },
        data: {
          documentNumber: 'REDACTED',
          documentImageFront: null,
          documentImageBack: null,
          selfieImage: null,
          status: 'REJECTED'
        }
      });

      // Cancelar cartões virtuais
      await tx.virtualCard.updateMany({
        where: { userId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      // Registrar exclusão no log de auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETION',
          resource: 'USER',
          metadata: {
            originalEmail: user.email,
            deletionReason: 'GDPR Article 17 - Right to erasure',
            retentionPeriod: '7 years for compliance',
            anonymizedAt: new Date().toISOString()
          }
        }
      });
    });

    // 5. Notificar por email (opcional)
    try {
      // Aqui você pode adicionar envio de email de confirmação
      logger.info('Account deletion completed successfully', { userId, email: user.email });
    } catch (emailError) {
      logger.error('Failed to send deletion confirmation email', { userId, email: user.email, error: emailError });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Conta anonimizada com sucesso. Seus dados pessoais foram removidos em conformidade com o GDPR.' 
    });

  } catch (error) {
    logger.error('Account deletion error', { error });
    return NextResponse.json({ 
      error: 'Erro ao processar exclusão de conta',
      details: 'Por favor, entre em contato com o suporte se o problema persistir'
    }, { status: 500 });
  }
}