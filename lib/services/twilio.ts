import twilio from 'twilio';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

interface OTPResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Gera e envia código OTP via SMS
 */
export async function sendOTP(
  phone: string,
  userId: string
): Promise<OTPResult> {
  try {
    // 1. Gerar código de 6 dígitos
    const code = crypto.randomInt(100000, 999999).toString();

    // 2. Salvar no DB com expiração de 5 minutos
    await prisma.oTP.create({
      data: {
        userId,
        phone,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        used: false
      }
    });

    // 3. Enviar SMS via Twilio
    const message = await client.messages.create({
      body: `Seu código GlobalSecureSend é: ${code}\nVálido por 5 minutos.`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone
    });

    return {
      success: true,
      messageSid: message.sid
    };
  } catch (error: any) {
    console.error('Twilio SMS Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica se o código OTP está correto
 */
export async function verifyOTP(
  phone: string,
  code: string
): Promise<boolean> {
  const otpRecord = await prisma.oTP.findFirst({
    where: {
      phone,
      code,
      expiresAt: { gt: new Date() },
      used: false
    }
  });

  if (!otpRecord) {
    return false;
  }

  // Marcar como usado
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { used: true, usedAt: new Date() }
  });

  return true;
}

/**
 * Limpa OTPs expirados (executar via cron job)
 */
export async function cleanExpiredOTPs() {
  await prisma.oTP.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  });
}
