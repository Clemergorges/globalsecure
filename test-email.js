/* eslint-disable @typescript-eslint/no-require-imports */
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🧪 Testando configuração SMTP...');
  
  // Configuração do transporter
  const transporter = nodemailer.createTransporter({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@globalsecuresend.com',
      pass: 'Clemer091@'
    }
  });

  try {
    // Testar conexão
    console.log('🔌 Verificando conexão...');
    await transporter.verify();
    console.log('✅ Conexão SMTP estabelecida!');

    // Enviar email de teste
    console.log('📧 Enviando email de teste...');
    const info = await transporter.sendMail({
      from: 'noreply@globalsecuresend.com',
      to: 'teste@globalsecuresend.com',
      subject: 'Teste GlobalSecure - Email Funcionando!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>🎉 Email Configurado com Sucesso!</h2>
          <p>Sua configuração SMTP está funcionando corretamente.</p>
          <p><strong>Host:</strong> mail.privateemail.com</p>
          <p><strong>Porta:</strong> 465</p>
          <p><strong>Usuário:</strong> noreply@globalsecuresend.com</p>
        </div>
      `
    });

    console.log('✅ Email enviado com sucesso!');
    console.log('📨 ID da mensagem:', info.messageId);
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    console.error('📋 Detalhes:', error);
  } finally {
    transporter.close();
  }
}

testEmail();