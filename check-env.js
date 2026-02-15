/* eslint-disable @typescript-eslint/no-require-imports */
// Testar variáveis de ambiente
console.log('🔍 Verificando variáveis de ambiente...');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configurada' : '❌ Não configurada');
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Carregar dotenv se estiver em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
  console.log('\n🔄 Após carregar dotenv:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Configurada' : '❌ Não configurada');
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
}