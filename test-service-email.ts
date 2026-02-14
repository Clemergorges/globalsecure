import { sendEmail, templates } from './src/lib/services/email';

async function testEmailService() {
  console.log('🧪 Testando serviço de email do GlobalSecure...');
  
  try {
    console.log('📧 Enviando email de teste...');
    
    const result = await sendEmail({
      to: 'teste@globalsecuresend.com',
      subject: '🧪 Teste GlobalSecure - Email Configurado!',
      html: templates.cardCreated(
        'Teste Usuário',
        '1234',
        '100.00',
        'EUR'
      )
    });

    if (result) {
      console.log('✅ Email enviado com sucesso!');
      console.log('📨 ID da mensagem:', result.messageId);
    } else {
      console.log('⚠️ Email não foi enviado (simulação ou erro)');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar email:', error);
  }
}

testEmailService();