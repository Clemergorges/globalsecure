import { NextRequest } from 'next/server';
import { headers, cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { validateTokenValue, validateSession } from '@/lib/session';

/**
 * Gets the current user session from the request headers.
 * The middleware is responsible for validating the session and attaching user data.
 * This function is a simple, fast reader for that data in Server Components and API Routes.
 * @returns The session object or null if not authenticated.
 */
export async function getSession() {
  const headersList = await headers();
  const headerUserId = headersList.get('x-user-id');
  const headerRole = headersList.get('x-user-role');
  const headerEmail = headersList.get('x-user-email');
  const headerSessionId = headersList.get('x-session-id');

  if (headerUserId) {
    return {
      userId: headerUserId,
      email: headerEmail || '',
      role: headerRole || 'END_USER',
      isAdmin: headerRole === 'ADMIN',
      sessionId: headerSessionId || undefined,
    };
  }

  const cookieStore = await cookies();
  const tokenValue = cookieStore.get('auth_token')?.value;

  if (!tokenValue) {
    return null;
  }

  const requestUserAgent = headersList.get('user-agent');
  const session = await validateTokenValue(tokenValue, requestUserAgent);
  if (!session) return null;

  return {
    userId: session.userId,
    email: session.email || '',
    role: session.role || 'END_USER',
    isAdmin: session.role === 'ADMIN',
    sessionId: session.sessionId,
  };
}

/**
 * A utility function to ensure a session exists, throwing an error if not.
 * Useful for protecting API routes and server-side logic.
 */
export async function checkAuth() {
  const session = await getSession();
  if (!session) {
    // This will be caught by a higher-level error boundary.
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * A utility function to ensure the user has ADMIN role.
 */
export async function checkAdmin() {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      throw new Error('Forbidden: Admin access required');
    }
    return session;
}

export function isAdmin(user: { email?: string | null; role?: string | null; isAdmin?: boolean | null } | null | undefined) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (user.role && user.role.toUpperCase() === 'ADMIN') return true;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const email = user.email ? user.email.toLowerCase() : '';
  return email === adminEmail.toLowerCase();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * DEPRECATED - The middleware is the source of truth.
 * This function might be useful for scenarios outside the middleware flow,
 * but getSession() should be preferred.
 * @param req 
 * @returns 
 */
export async function extractUserId(req: NextRequest): Promise<string | undefined> {
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  const session = await validateSession(req);
  return session?.userId || undefined;
}
