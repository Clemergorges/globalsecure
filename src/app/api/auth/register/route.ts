import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail, templates } from '@/lib/services/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit, logger } from '@/lib/logger';
import { getCurrencyForCountry } from '@/lib/country-config';
import { getOrCreateCurrentConsentDocument } from '@/lib/services/privacy-consent';
import { withRouteContext } from '@/lib/http/route';
import { env } from '@/lib/config/env';

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  country: z.string().length(2),
  gdprConsent: z.boolean().refine((val) => val === true, {
    message: 'Consentimento GDPR é obrigatório',
  }),
  marketingConsent: z.boolean().optional(),
});

function hashEmailOtp(code: string) {
  return crypto.createHash('sha256').update(`${code}.${env.otpPepper()}`).digest('hex');
}

export const POST = withRouteContext(async (req: NextRequest, ctx) => {
  try {
    const limit = await checkRateLimit(`register:${ctx.ipAddress}`, 5, 3600);
    if (!limit.success) {
      await logAudit({
        action: 'REGISTER_BLOCKED',
        status: '429',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        path: ctx.path,
        metadata: { limit: limit.limit, remaining: limit.remaining, requestId: ctx.requestId },
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.' },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, password, country, gdprConsent, marketingConsent } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const consentDoc = await getOrCreateCurrentConsentDocument({ locale: 'en' });

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const determinedCurrency = getCurrencyForCountry(country);

    const otpCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const otpCodeHash = hashEmailOtp(otpCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

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
            create: { currency: determinedCurrency, amount: 0 },
          },
          account: {
            create: {
              status: 'UNVERIFIED',
              primaryCurrency: determinedCurrency,
              balances: {
                create: { currency: determinedCurrency, amount: 0 },
              },
            },
          },
        },
        include: { account: true },
      });

      await tx.userConsentRecord.create({
        data: {
          userId: user.id,
          consentType: 'GDPR_TERMS',
          documentVersion: consentDoc.version,
          acceptedAt: new Date(),
          ip: ctx.ipAddress,
          userAgent: ctx.userAgent,
        },
      });

      await tx.oTP.create({
        data: {
          userId: user.id,
          type: 'EMAIL',
          channel: 'email',
          target: normalizedEmail,
          code: otpCodeHash,
          expiresAt,
        },
      });

      return { user };
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Verifique seu Email - GlobalSecureSend',
      html: templates.verificationCode(otpCode),
    });

    if (!emailResult?.ok) {
      await logAudit({
        userId: created.user.id,
        action: 'REGISTER_EMAIL_FAILED',
        status: '200',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        path: ctx.path,
        metadata: { email: normalizedEmail, reason: emailResult?.error || 'UNKNOWN', requestId: ctx.requestId },
      }).catch(() => {});

      await logAudit({
        userId: created.user.id,
        action: 'REGISTER_CREATED',
        status: '201',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        path: ctx.path,
        metadata: { email: normalizedEmail, emailSent: false, requestId: ctx.requestId },
      }).catch(() => {});

      return NextResponse.json(
        {
          success: true,
          userId: created.user.id,
          email: created.user.email,
          emailSent: false,
          message: 'Usuário criado. Não foi possível enviar o email agora; tente reenviar o código.',
        },
        { status: 201 },
      );
    }

    await logAudit({
      userId: created.user.id,
      action: 'REGISTER_SUCCESS',
      status: '201',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      path: ctx.path,
      metadata: { requestId: ctx.requestId },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        userId: created.user.id,
        email: created.user.email,
        emailSent: true,
        message: 'Usuário criado. Verifique seu email.',
      },
      { status: 201 },
    );
  } catch (error: any) {
    logger.error({ err: error?.message || String(error) }, 'register error');
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}, { requireAuth: false });

