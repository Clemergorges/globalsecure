import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createDataExportJob } from '@/lib/services/data-export';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const job = await createDataExportJob({ userId: session.userId, ip, userAgent });
  return NextResponse.json({ jobId: job.id, expiresAt: job.expiresAt }, { status: 201 });
}

