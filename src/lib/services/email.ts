import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.resend.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'resend',
    pass: process.env.SMTP_PASS,
  },
});

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  if (!process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP_PASS not configured. Email simulation:', { to, subject });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"GlobalSecure Send" <noreply@globalsecuresend.com>',
      to,
      subject,
      html,
    });
    console.log('📧 Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email failed:', error);
    // Don't throw error to avoid breaking the transaction flow
  }
}

// Templates HTML simples
export const templates = {
  cardClaim: (name: string, amount: string, currency: string, claimLink: string) => `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2563eb;">Pagamento Seguro Recebido 🛡️</h2>
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Você recebeu um link de pagamento seguro via GlobalSecure.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Valor Disponível:</strong> ${currency} ${amount}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> Protegido por Senha 🔒</p>
      </div>

      <p>Para acessar os fundos e visualizar o cartão virtual associado, clique no link abaixo:</p>
      <a href="${claimLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Fundos</a>
      
      <p style="margin-top: 20px;"><em>Você precisará do Código de Segurança fornecido pelo remetente para desbloquear este valor.</em></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #666;">Transação processada via protocolo GlobalSecure Decentralized Link.</p>
    </div>
  `,

  cardCreated: (name: string, last4: string, amount: string, currency: string) => `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2563eb;">Seu Cartão Virtual Chegou! 💳</h2>
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Você recebeu um cartão virtual GlobalSecure com saldo pré-carregado.</p>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Valor:</strong> ${currency} ${amount}</p>
        <p style="margin: 5px 0;"><strong>Cartão:</strong> **** **** **** ${last4}</p>
        <p style="margin: 5px 0;"><strong>Validade:</strong> 3 anos</p>
      </div>

      <p>Para ver os detalhes completos (número e CVC), acesse sua conta segura:</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cards" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Meu Cartão</a>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #666;">Se você não esperava este e-mail, entre em contato com nosso suporte.</p>
    </div>
  `,
  
  welcome: (name: string) => `
    <div style="font-family: sans-serif; color: #333; padding: 20px;">
      <h2>Bem-vindo à GlobalSecure! </h2>
      <p>Olá ${name}, sua conta foi criada com sucesso.</p>
    </div>
  `,

  verificationCode: (code: string) => `
    <div style="font-family: sans-serif; color: #4d4646ff; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2564eb9f;">Verifique seu Email 🔒</h2>
      <p>Use o código abaixo para confirmar sua conta na GlobalSecure:</p>
      
      <div style="background: #dae2e9ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
      </div>

      <p>Este código expira em 15 minutos.</p>
      <p style="font-size: 12px; color: #666;">Se você não solicitou este código, ignore este e-mail.</p>
    </div>
  `
};