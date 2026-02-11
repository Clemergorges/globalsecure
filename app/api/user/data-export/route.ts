import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.userId;

    // Coletar todos os dados do usuário
    const [
      userProfile,
      transactions,
      receivedTransfers,
      cards,
      kycDocuments,
      sessions,
      notifications,
      auditLogs
    ] = await Promise.all([
      // Perfil do usuário
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          country: true,
          timezone: true,
          kycLevel: true,
          kycStatus: true,
          gdprConsent: true,
          gdprConsentAt: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      }),

      // Transações enviadas
      prisma.transfer.findMany({
        where: { senderId: userId },
        select: {
          id: true,
          amount: true,
          currency: true,
          targetCurrency: true,
          exchangeRate: true,
          status: true,
          type: true,
          description: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Transações recebidas
      prisma.transfer.findMany({
        where: { receiverId: userId },
        select: {
          id: true,
          amount: true,
          currency: true,
          targetCurrency: true,
          exchangeRate: true,
          status: true,
          type: true,
          description: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Cartões virtuais
      prisma.virtualCard.findMany({
        where: { userId },
        select: {
          id: true,
          last4Digits: true,
          cardholderName: true,
          currency: true,
          status: true,
          createdAt: true,
          cancelledAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Documentos KYC (com informações sensíveis redigidas)
      prisma.kYCDocument.findMany({
        where: { userId },
        select: {
          id: true,
          documentType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          verifiedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Sessões de login
      prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limitar para últimas 50 sessões
      }),

      // Notificações
      prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          read: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limitar para últimas 100 notificações
      }),

      // Logs de auditoria
      prisma.auditLog.findMany({
        where: { userId },
        select: {
          id: true,
          action: true,
          resource: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 200 // Limitar para últimos 200 logs
      })
    ]);

    if (!userProfile) {
      return NextResponse.json({ error: 'Perfil do usuário não encontrado' }, { status: 404 });
    }

    // Registrar acesso aos dados (GDPR Art. 15 - Direito de Acesso)
    logger.info('User data export requested', { 
      userId, 
      exportDate: new Date().toISOString(),
      dataCategories: ['profile', 'transactions', 'cards', 'kyc', 'sessions', 'notifications', 'auditLogs']
    });

    // Montar objeto de exportação completo
    const userData = {
      // Metadados da exportação
      exportInfo: {
        exportDate: new Date().toISOString(),
        format: 'JSON',
        version: '1.0',
        gdprCompliant: true,
        userId: userProfile.id
      },

      // Perfil do usuário (dados pessoais)
      profile: userProfile,

      // Dados financeiros
      financialData: {
        sentTransfers: transactions,
        receivedTransfers: receivedTransfers,
        totalSent: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
        totalReceived: receivedTransfers.reduce((sum, t) => sum + Number(t.amount), 0),
        currenciesUsed: [...new Set([...transactions, ...receivedTransfers].map(t => t.currency))]
      },

      // Cartões virtuais
      virtualCards: {
        cards: cards,
        totalCards: cards.length,
        activeCards: cards.filter(c => c.status === 'ACTIVE').length
      },

      // Documentos de identidade (KYC)
      identityDocuments: {
        documents: kycDocuments,
        kycLevel: userProfile.kycLevel,
        kycStatus: userProfile.kycStatus
      },

      // Histórico de acessos
      sessionHistory: {
        sessions: sessions,
        totalSessions: sessions.length,
        uniqueIPs: [...new Set(sessions.map(s => s.ipAddress))].length
      },

      // Comunicações
      notifications: {
        notifications: notifications,
        totalNotifications: notifications.length,
        unreadNotifications: notifications.filter(n => !n.read).length
      },

      // Logs de auditoria
      auditTrail: {
        logs: auditLogs,
        totalLogs: auditLogs.length,
        firstActivity: auditLogs.length > 0 ? auditLogs[auditLogs.length - 1].createdAt : null,
        lastActivity: auditLogs.length > 0 ? auditLogs[0].createdAt : null
      },

      // Consentimentos GDPR
      gdprConsents: {
        privacyPolicyConsent: userProfile.gdprConsent,
        consentDate: userProfile.gdprConsentAt,
        dataProcessingLegalBasis: 'CONSENT', // Base legal principal
        dataRetentionPeriod: '7 years for financial compliance'
      }
    };

    // Retornar dados com headers para download
    return NextResponse.json(userData, {
      headers: {
        'Content-Disposition': `attachment; filename="user-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logger.error('Data export error', { error, userId: session?.userId });
    return NextResponse.json({ 
      error: 'Erro ao exportar dados',
      details: 'Não foi possível coletar todos os seus dados. Por favor, tente novamente ou entre em contato com o suporte.'
    }, { status: 500 });
  }
}