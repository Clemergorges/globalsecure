import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Buscar um usuário real do banco
    const user = await prisma.user.findFirst();
    
    if (!user) {
      return Response.json({ 
        success: false, 
        message: 'Nenhum usuário encontrado no banco. Crie um usuário primeiro.' 
      });
    }

    // Criar um alerta manual no banco para teste
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ALERT_WARNING',
        status: 'SUCCESS',
        metadata: {
          title: 'Teste de Monitoramento - Sistema Online',
          message: 'GlobalSecureSend está funcionando corretamente com monitoramento ativo',
          source: 'SYSTEM_STARTUP',
          test: true,
          userEmail: user.email
        }
      }
    });

    return Response.json({ 
      success: true, 
      message: 'Alerta de teste criado com sucesso!',
      details: `Alerta criado para o usuário: ${user.email}`,
      dashboard: 'Verifique o dashboard admin em /admin/alerts'
    });
  } catch (error) {
    console.error('Erro ao criar alerta de teste:', error);
    return Response.json(
      { success: false, error: 'Erro ao criar alerta de teste' },
      { status: 500 }
    );
  }
}