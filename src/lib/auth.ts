import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-me';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    // Verify session in DB for extra security (revocation check)
    const session = await prisma.session.findFirst({
      where: { token },
    });

    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      isAdmin: payload.role === 'ADMIN',
    };
  } catch (error) {
    return null;
  }
}

export async function checkAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function checkAdmin() {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    throw new Error('Forbidden');
  }
  return session;
}
