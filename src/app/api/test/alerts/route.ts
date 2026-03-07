import { NextRequest, NextResponse } from 'next/server';
import { alertService } from '@/lib/services/alert';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testando sistema de alertas via API...');
    
    // Teste de alerta INFO
    await alertService.notify({
      title: 'Teste de Sistema - INFO',
      message: 'Sistema GlobalSecureSend iniciado com sucesso em ambiente de teste',
      severity: 'INFO',
      source: 'SYSTEM_STARTUP',
      userId: 'system-test',
      channels: ['DB', 'SLACK']
    });
    
    // Teste de alerta WARNING
    await alertService.notify({
      title: 'Teste de Sistema - WARNING',
      message: 'Teste de monitoramento de segurança',
      severity: 'WARNING',
      source: 'SECURITY_TEST',
      userId: 'system-test',
      channels: ['DB', 'SLACK']
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Alertas de teste enviados com sucesso!',
      details: {
        info: 'Alerta INFO enviado para DB e Slack',
        warning: 'Alerta WARNING enviado para DB e Slack'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao testar alertas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar alertas de teste' },
      { status: 500 }
    );
  }
}