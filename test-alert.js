// Teste rápido do sistema de alertas
const { alertService } = require('./src/lib/services/alert');

async function testAlert() {
  try {
    console.log('🧪 Testando sistema de alertas...');
    
    // Teste de alerta INFO
    await alertService.notify({
      title: 'Teste de Sistema - INFO',
      message: 'Sistema GlobalSecureSend iniciado com sucesso em ambiente de teste',
      severity: 'INFO',
      source: 'SYSTEM_STARTUP',
      userId: 'system-test',
      channels: ['DB', 'SLACK']
    });
    
    console.log('✅ Alerta INFO enviado com sucesso!');
    
    // Teste de alerta WARNING
    await alertService.notify({
      title: 'Teste de Sistema - WARNING',
      message: 'Teste de monitoramento de segurança',
      severity: 'WARNING',
      source: 'SECURITY_TEST',
      userId: 'system-test',
      channels: ['DB', 'SLACK']
    });
    
    console.log('✅ Alerta WARNING enviado com sucesso!');
    
    console.log('🎉 Testes de alerta concluídos! Verifique o Slack e o dashboard admin.');
    
  } catch (error) {
    console.error('❌ Erro ao testar alertas:', error);
  }
}

testAlert();