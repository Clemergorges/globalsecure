import { prisma } from '@/lib/db';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/env';

const COOKIE_NAME = 'auth_token';

let cachedJwtSecretKey: Uint8Array | null = null;
function jwtSecretKey() {
  if (cachedJwtSecretKey) return cachedJwtSecretKey;
  cachedJwtSecretKey = new TextEncoder().encode(env.jwtSecret());
  return cachedJwtSecretKey;
}

const USER_ROLE_DURATION_SECONDS = 8 * 60 * 60;
const ADMIN_ROLE_DURATION_SECONDS = 60 * 60;

interface UserPayload {
  id: string;
  role: string;
}

interface SessionPayload {
  sessionId: string;
  userId: string;
  role: string;
  email: string;
}

function getSessionMaxAgeSeconds(role: string) {
  const isAdmin = role === 'ADMIN' || role === 'TREASURY' || role === 'COMPLIANCE';
  return isAdmin ? ADMIN_ROLE_DURATION_SECONDS : USER_ROLE_DURATION_SECONDS;
}

/**
 * Creates a new session in the database and returns a JWT.
 * @param user - The user object, including id and role.
 * @param ip - The IP address of the user.
 * @param userAgent - The user agent string.
 * @returns The session JWT.
 */
export async function createSession(user: UserPayload, ip: string, userAgent: string) {
  const maxAgeSeconds = getSessionMaxAgeSeconds(user.role);
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const sessionId = globalThis.crypto.randomUUID();

  // Create the session in the database
  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      token: sessionId,
      expiresAt,
      ipAddress: ip,
      userAgent: userAgent,
    },
  });

  // The JWT payload only contains the session ID. All other data is in the DB.
  const token = await new SignJWT({ role: user.role, userId: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(new Date(expiresAt.getTime() + 5000))
    .sign(jwtSecretKey());

  return { token, sessionId, expiresAt, maxAgeSeconds };
}

export async function validateTokenValue(tokenValue: string, requestUserAgent: string | null): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(tokenValue, jwtSecretKey());
    const sessionId = payload.jti as string | undefined;

    if (!sessionId) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, role: true, email: true } } }
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      if (session && !session.revokedAt) {
        await revokeSession(sessionId);
      }
      return null;
    }

    const storedUserAgent = session.userAgent || null;
    if (storedUserAgent && requestUserAgent && storedUserAgent !== requestUserAgent) {
      const strictUa = process.env.SESSION_STRICT_UA === 'true' || process.env.NODE_ENV === 'production';
      if (strictUa) {
        await revokeSession(sessionId);
        return null;
      }
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      role: session.user.role || 'END_USER',
      email: session.user.email,
    };
  } catch {
    return null;
  }
}

/**
 * Validates the session from the request cookie.
 * @param request - The NextRequest object.
 * @returns The session payload if valid, otherwise null.
 */
export async function validateSession(request: NextRequest): Promise<SessionPayload | null> {
  const tokenValue = request.cookies.get(COOKIE_NAME)?.value;

  if (!tokenValue) {
    return null;
  }

  const requestUserAgent = request.headers.get('user-agent');
  return validateTokenValue(tokenValue, requestUserAgent);
}

/**
 * Revokes a session by setting the `revokedAt` timestamp.
 * @param sessionId - The ID of the session to revoke.
 */
export async function revokeSession(sessionId: string) {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    // Session may not exist, fail silently
  }
}

/**
 * Sets the session cookie on the response.
 * @param response - The NextResponse object.
 * @param token - The session JWT.
 * @param maxAgeSeconds - Cookie max-age in seconds.
 */
export function setSessionCookie(response: NextResponse, token: string, maxAgeSeconds: number) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv() === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

/**
 * Clears the session cookie on the response.
 * @param response - The NextResponse object.
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: env.nodeEnv() === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
