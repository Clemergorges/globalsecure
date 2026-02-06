import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
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

    const { fullName, email, password, country, mainCurrency } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Split full name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
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

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, fullName: `${user.firstName} ${user.lastName}`.trim() } 
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
