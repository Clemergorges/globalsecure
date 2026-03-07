import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { validateSession } from '@/lib/session';

export type RbacSession = {
  sessionId: string;
  userId: string;
  role: UserRole | string;
  email: string;
};

export async function requireSession(request: NextRequest): Promise<RbacSession | NextResponse> {
  const session = await validateSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return session;
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: readonly UserRole[],
): Promise<RbacSession | NextResponse> {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  if (!allowedRoles.includes(session.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session;
}

export async function requireSelfOrRoles(
  request: NextRequest,
  resourceUserId: string,
  allowedRoles: readonly UserRole[],
): Promise<RbacSession | NextResponse> {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  if (session.userId !== resourceUserId && !allowedRoles.includes(session.role as UserRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session;
}
