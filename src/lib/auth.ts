import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-me';

// --- New Helper for API Handler ---
export async function extractUserId(req: NextRequest): Promise<string | undefined> {
  // 1. Try Authorization Header (Bearer)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { payload } = await jose.jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      );
      return payload.userId as string;
    } catch {
      // Invalid token in header, try cookie
    }
  }

  // 2. Try Cookie (auth_token)
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (token) {
    try {
      const { payload } = await jose.jwtVerify(
        token,
        new TextEncoder().encode(JWT_SECRET)
      );
      return payload.userId as string;
    } catch {
      return undefined;
    }
  }
  
  return undefined;
}
// ----------------------------------

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    // Bypass DB session check for now to prevent loop if DB is locked/slow
    /*
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
    */

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
