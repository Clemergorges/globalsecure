
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { JWTPayload, JWTVerificationResult, SessionData } from './types/jwt';
import { isAdmin } from './services/admin';

const JWT_SECRET = process.env.JWT_SECRET || 'GlobalSecureSecret2026!';

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Sign JWT token with typed payload
 */
export function signToken(payload: { userId: string; email: string; role?: 'USER' | 'ADMIN'; sessionId?: string }): string {
  const base: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role ?? 'USER',
    sessionId: payload.sessionId,
  };
  // Hardening: Short expiration (15m) + Refresh Token flow would be better, but for now reducing to 1h
  return jwt.sign(base, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Verify JWT token and return typed payload
 */
export function verifyToken(token: string): JWTVerificationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return { valid: true, payload };
  } catch (error) {
    console.error('Verify Token Error:', error instanceof Error ? error.message : error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token'
    };
  }
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  const result = verifyToken(token);
  return result.valid ? result.payload! : null;
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<SessionData | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    role: session.role,
    sessionId: session.sessionId,
  };
}

/**
 * Check if current user is admin
 */
export async function checkAdmin(): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  // Check if user is admin using centralized service
  return isAdmin(session.email);
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await checkAuth();

  if (!session) {
    throw new Error('Unauthorized: Authentication required');
  }

  return session;
}

/**
 * Require admin access (throws if not admin)
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();

  if (!isAdmin(session.email)) {
    throw new Error('Unauthorized: Admin access required');
  }

  return session;
}
