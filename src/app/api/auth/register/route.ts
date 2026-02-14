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
import { validateDocument, isAdult } from '@/lib/validation';

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8), // Basic phone validation
  password: z.string().min(6),
  country: z.string().length(2),
  mainCurrency: z.string().length(3).optional(), // Optional now, determined by backend
  // Novos Campos
  documentId: z.string().min(5),
  birthDate: z.string().refine(val => isAdult(val), { message: "Você deve ter pelo menos 18 anos" }),
  gender: z.enum(['M', 'F', 'O', 'NB']),
  // Consentimentos GDPR - OBRIGATÓRIOS
  gdprConsent: z.boolean().refine(val => val === true, {
    message: "Consentimento GDPR é obrigatório"
  }),
  cookieConsent: z.boolean().refine(val => val === true, {
    message: "Consentimento de cookies é obrigatório"
  }),
  marketingConsent: z.boolean().optional(),
  // Allow these fields but don't strictly require them for now
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  language: z.string().optional().or(z.literal(""))
});

export async function POST(req: Request) {
  const ip = (await headers()).get('x-forwarded-for') || 'unknown';
  const userAgent = (await headers()).get('user-agent') || 'unknown';

  try {
    // 1. Security: Rate Limiting (5 attempts per hour per IP)
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

    // Trigger Vercel Re-Deploy
    const body = await req.json();
    // console.log('[Register] Body received:', body);

    // ✅ Log seguro
    console.log('[Register] Registration attempt for:', {
      email: body.email,
      country: body.country,
      hasPassword: !!body.password // Apenas confirma presença, não o valor
    });

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[Register] Validation error:', parsed.error.format());
      await logAudit({ action: 'REGISTER_FAILED', status: '400', ipAddress: ip, userAgent, metadata: { error: 'Validation Failed' } });
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, email, phone, password, country, documentId, birthDate, gender, gdprConsent, cookieConsent, marketingConsent, address, city, postalCode, language } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Validação Específica por País
    if (!validateDocument(country, documentId)) {
        const errorMsg = country === 'BR' ? 'CPF inválido' : 
                        country === 'US' ? 'SSN/Passaporte inválido (9 dígitos ou 6-9 alfanum)' : 
                        'Documento inválido (Mínimo 5 caracteres)';
        return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Determine Currency automatically based on Country
    const determinedCurrency = getCurrencyForCountry(country);

    // Split fullName into firstName and lastName for database storage
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone },
          { documentId }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
      if (existingUser.phone === phone) {
        return NextResponse.json({ error: 'Telefone já cadastrado' }, { status: 400 });
      }
      if (existingUser.documentId === documentId) {
        return NextResponse.json({ error: 'Documento já cadastrado' }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(password);

    // Create user (Unverified)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        phone,
        emailVerified: false,
        phoneVerified: false,
        passwordHash,
        country: country.toUpperCase(),
        // Novos Campos
        documentId,
        birthDate: new Date(birthDate),
        gender,
        // Endereço
        address,
        city,
        postalCode,
        language: language || 'en',
        // Consentimentos GDPR
        gdprConsent: true,
        gdprConsentAt: new Date(),
        cookieConsent: cookieConsent,
        marketingConsent: marketingConsent || false,
        wallet: {
          create: {
            primaryCurrency: determinedCurrency,
            balances: {
                create: { currency: determinedCurrency, amount: 0 }
            }
          }
        }
      },
      include: {
        wallet: true
      }
    });

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP
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
    await sendEmail({
      to: normalizedEmail,
      subject: 'Código de Verificação - GlobalSecure',
      html: templates.verificationCode(otpCode)
    });

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
      requireVerification: true,
      userId: user.id,
      email: user.email,
      phone: user.phone
    });

  } catch (error) {
    console.error('Registration error:', error);
    await logAudit({ action: 'REGISTER_ERROR', status: '500', ipAddress: ip, userAgent, metadata: { error: String(error) } });
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}