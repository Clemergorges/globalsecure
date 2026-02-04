import QRCode from 'qrcode';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db';

interface CardDeliveryData {
  claimUrl: string;
  qrCodeDataUrl: string;
  token: string;
}

/**
 * Gera link seguro + QR Code para claim de cartão
 */
export async function generateSecureCardLink(
  cardId: string,
  recipientEmail: string
): Promise<CardDeliveryData> {
  // 1. Gerar token único de 32 bytes
  const token = crypto.randomBytes(32).toString('hex');

  // 2. Salvar no DB com expiração 24h
  await prisma.cardActivationToken.create({
    data: {
      token,
      cardId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      used: false
    }
  });

  // 3. Gerar URL de claim
  const claimUrl = `${process.env.NEXT_PUBLIC_URL}/claim/${token}`;

  // 4. Gerar QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(claimUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // 5. Enviar email
  await sendCardEmail(recipientEmail, claimUrl, qrCodeDataUrl);

  return {
    claimUrl,
    qrCodeDataUrl,
    token
  };
}

/**
 * Envia email com link e QR Code do cartão
 */
async function sendCardEmail(
  recipientEmail: string,
  claimUrl: string,
  qrCodeDataUrl: string
) {
  // Configurar transporter (SendGrid, Mailgun, etc)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: '"GlobalSecureSend" <noreply@globalsecuresend.com>',
    to: recipientEmail,
    subject: '💳 Você recebeu um cartão virtual GlobalSecureSend!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .qr-code { text-align: center; margin: 30px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Você recebeu fundos!</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p>Você acaba de receber um <strong>cartão virtual GlobalSecureSend</strong> com fundos disponíveis para usar.</p>
            
            <h3>📱 Como ativar:</h3>
            <ol>
              <li>Clique no botão abaixo ou escaneie o QR Code</li>
              <li>Veja os detalhes do seu cartão</li>
              <li>Adicione ao Apple Wallet ou Google Pay (opcional)</li>
              <li>Use em compras online ou físicas!</li>
            </ol>

            <div style="text-align: center;">
              <a href="${claimUrl}" class="button">Ativar Cartão</a>
            </div>

            <div class="qr-code">
              <p><strong>Ou escaneie o QR Code:</strong></p>
              <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 300px;">
            </div>

            <div class="warning">
              ⚠️ <strong>Importante:</strong> Este link expira em 24 horas e só pode ser usado uma vez. Não compartilhe com ninguém!
            </div>

            <p>Se você não esperava este email, pode ignorá-lo com segurança.</p>
          </div>
          <div class="footer">
            <p>GlobalSecureSend - Remessas Globais Seguras</p>
            <p>Este é um email automático, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Valida token de claim
 */
export async function validateClaimToken(token: string) {
  const tokenRecord = await prisma.cardActivationToken.findUnique({
    where: { token },
    include: { card: true }
  });

  if (!tokenRecord) {
    return { valid: false, error: 'Token inválido' };
  }

  if (tokenRecord.used) {
    return { valid: false, error: 'Token já utilizado' };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return { valid: false, error: 'Token expirado' };
  }

  return { valid: true, cardId: tokenRecord.cardId };
}

/**
 * Marca token como usado
 */
export async function markTokenAsUsed(token: string) {
  await prisma.cardActivationToken.update({
    where: { token },
    data: {
      used: true,
      usedAt: new Date()
    }
  });
}
