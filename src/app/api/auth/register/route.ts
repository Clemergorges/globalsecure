
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail, templates } from '@/lib/services/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/logger';
import { getCurrencyForCountry } from '@/lib/country-config';
import { getOrCreateCurrentConsentDocument } from '@/lib/services/privacy-consent';

// Etapa 1: Cadastro Simplificado (Sign Up)
// Apenas Email, Senha, País e Termos
const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
  country: z.string().length(2),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: "Consentimento GDPR é obrigatório"
  }),
  marketingConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    // 1. Rate Limiting
    const limit = await checkRateLimit(`register:${ip}`, 5, 3600);
    
    if (!limit.success) {
      await logAudit({
        action: 'REGISTER_BLOCKED',
        status: '429',
        ipAddress: ip,
        userAgent,
        path: '/api/auth/register',
        metadata: { limit: limit.limit, remaining: limit.remaining }
      });
      return NextResponse.json(
        { error: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, country, gdprConsent, marketingConsent } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const consentDoc = await getOrCreateCurrentConsentDocument({ locale: 'en' });

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const determinedCurrency = getCurrencyForCountry(country);

    // Generate Verification Code (Email)
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          country: country.toUpperCase(),
          emailVerified: false,
          phoneVerified: false,
          gdprConsent,
          gdprConsentAt: gdprConsent ? new Date() : null,
          marketingConsent: marketingConsent || false,
          kycLevel: 0,
          kycStatus: 'PENDING',
          fiatBalances: {
            create: { currency: determinedCurrency, amount: 0 }
          },
          account: {
            create: {
              status: 'UNVERIFIED',
              primaryCurrency: determinedCurrency,
              balances: {
                create: { currency: determinedCurrency, amount: 0 }
              }
            }
          }
        },
        include: { account: true }
      });

      await tx.userConsentRecord.create({
        data: {
          userId: user.id,
          consentType: 'GDPR_TERMS',
          documentVersion: consentDoc.version,
          acceptedAt: new Date(),
          ip,
          userAgent,
        }
      });

      const otp = await tx.oTP.create({
        data: {
          userId: user.id,
          type: 'EMAIL',
          channel: 'email',
          target: normalizedEmail,
          code: otpCode,
          expiresAt
        }
      });

      return { user, otp };
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Verifique seu Email - GlobalSecureSend',
      html: templates.verificationCode(otpCode)
    });

    if (!emailResult?.ok) {
      try {
        await prisma.$transaction(async (tx) => {
          const userId = created.user.id;
          const accountId = created.user.account?.id;

          await tx.oTP.deleteMany({ where: { userId, type: 'EMAIL' } });

          if (accountId) {
            await tx.balance.deleteMany({ where: { accountId } });
            await tx.accountTransaction.deleteMany({ where: { accountId } });
            await tx.account.deleteMany({ where: { id: accountId } });
          } else {
            await tx.account.deleteMany({ where: { userId } });
          }

          await tx.user.delete({ where: { id: userId } });
        });
      } catch (rollbackError) {
        console.error('Registration rollback error:', rollbackError);
      }

      await logAudit({
        action: 'REGISTER_EMAIL_FAILED',
        status: '503',
        ipAddress: ip,
        userAgent,
        path: '/api/auth/register',
        metadata: { email: normalizedEmail, reason: emailResult?.error || 'UNKNOWN' }
      });

      return NextResponse.json(
        { error: 'Falha ao enviar o email de verificação. Tente novamente.' },
        { status: 503 }
      );
    }

    await logAudit({
        userId: created.user.id,
        action: 'REGISTER_SUCCESS',
        status: '201',
        ipAddress: ip,
        userAgent,
        path: '/api/auth/register'
    });

    return NextResponse.json({ 
      success: true, 
      userId: created.user.id,
      email: created.user.email,
      emailSent: true,
      message: "Usuário criado. Verifique seu email."
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
