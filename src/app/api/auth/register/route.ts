
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail, templates } from '@/lib/services/email';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/logger';
import { getCurrencyForCountry } from '@/lib/country-config';

// Etapa 1: Cadastro Simplificado (Sign Up)
// Apenas Email, Senha, País e Termos
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
  country: z.string().length(2),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: "Consentimento GDPR é obrigatório"
  }),
  marketingConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ip = (await headers()).get('x-forwarded-for') || 'unknown';
  const userAgent = (await headers()).get('user-agent') || 'unknown';

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
    console.log('[Register] Attempt:', { email: body.email, country: body.country });

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, country, gdprConsent, marketingConsent } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const determinedCurrency = getCurrencyForCountry(country);

    // Create User + Account (UNVERIFIED / PENDING)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        country: country.toUpperCase(),
        emailVerified: false,
        phoneVerified: false,
        gdprConsent: true,
        gdprConsentAt: new Date(),
        marketingConsent: marketingConsent || false,
        kycLevel: 0,
        kycStatus: 'PENDING',
        account: {
          create: {
            status: 'UNVERIFIED', // New Account Status
            primaryCurrency: determinedCurrency,
            balances: {
                create: { currency: determinedCurrency, amount: 0 }
            }
          }
        }
      },
      include: {
        account: true
      }
    });

    // Generate Verification Code (Email)
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.oTP.create({
      data: {
        userId: user.id,
        type: 'EMAIL',
        channel: 'email',
        target: normalizedEmail,
        code: otpCode,
        expiresAt
      }
    });

    // Send Email
    // Note: Assuming sendEmail implementation is correct
    try {
        await sendEmail({
        to: normalizedEmail,
        subject: 'Verifique seu Email - GlobalSecure',
        html: templates.verificationCode(otpCode) // Ensure this template exists or use simple text
        });
    } catch (emailError) {
        console.error("Failed to send email", emailError);
        // Don't fail the request, just log it. User can resend.
    }

    await logAudit({
        userId: user.id,
        action: 'REGISTER_SUCCESS',
        status: '201',
        ipAddress: ip,
        userAgent,
        path: '/api/auth/register'
    });

    return NextResponse.json({ 
      success: true, 
      userId: user.id,
      email: user.email,
      message: "Usuário criado. Verifique seu email."
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
