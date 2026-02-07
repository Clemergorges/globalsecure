import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { sendEmail, templates } from '@/lib/services/email';

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8), // Basic phone validation
  password: z.string().min(6),
  country: z.string().length(2),
  mainCurrency: z.string().length(3),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Register] Body received:', body);

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[Register] Validation error:', parsed.error.format());
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, email, phone, password, country, mainCurrency } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Telefone já cadastrado' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Split full name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

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
        country,
        wallet: {
          create: {
            primaryCurrency: mainCurrency,
            balanceEUR: 0,
            balanceUSD: 0,
            balanceGBP: 0
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

    return NextResponse.json({ 
      success: true, 
      requireVerification: true,
      userId: user.id,
      email: user.email,
      phone: user.phone
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}