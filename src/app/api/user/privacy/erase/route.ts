import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createAndRunDeletionJob } from '@/lib/services/privacy-erasure';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const result = await createAndRunDeletionJob({
    userId: session.userId,
    ip,
    userAgent,
  });

  if (!result.ok) {
    return NextResponse.json({
      error: 'Account cannot be erased due to legal hold',
      code: result.reason,
      blockingCase: result.blockingCase,
    }, { status: 409 });
  }

  return NextResponse.json({ success: true, jobId: result.jobId });
}

