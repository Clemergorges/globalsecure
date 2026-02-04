import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';
import { z } from 'zod';
import { cookies } from 'next/headers';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const token = signToken({ userId: user.id, email: user.email });

    // Set Cookie
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hour
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, fullName: `${user.firstName} ${user.lastName}`.trim() } 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
