
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Fetch user with current password hash
    const user = await prisma.user.findUnique({
      // @ts-ignore
      where: { id: session.userId }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify current password
    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });

    // Optional: Revoke all other sessions for security
    // await prisma.session.deleteMany({ where: { userId: user.id, token: { not: currentToken } } });

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      // @ts-ignore
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
