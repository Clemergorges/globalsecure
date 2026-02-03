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
    const { fullName, email, password, country, mainCurrency } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        country,
        mainCurrency,
        accounts: {
          create: {
            currency: mainCurrency,
            balance: 0,
          }
        }
      },
      include: {
        accounts: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, fullName: user.fullName } 
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
