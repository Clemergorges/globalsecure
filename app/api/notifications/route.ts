import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getNotifications, markAllAsRead } from '@/lib/notifications';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // @ts-ignore
  const notifications = await getNotifications(session.userId);
  return NextResponse.json({ notifications });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // @ts-ignore
  await markAllAsRead(session.userId);
  return NextResponse.json({ success: true });
}