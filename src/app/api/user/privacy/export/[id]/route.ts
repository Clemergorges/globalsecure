import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getExportBundle } from '@/lib/services/data-export';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const { id } = await params;

  try {
    const bundle = await getExportBundle({
      userId: session.userId,
      jobId: id,
      ip,
      userAgent,
    });

    return NextResponse.json(bundle, {
      headers: {
        'Content-Disposition': `attachment; filename="gdpr-export-${session.userId}.json"`,
      }
    });
  } catch (e: any) {
    const message = String(e?.message || 'UNKNOWN');
    if (message === 'EXPORT_NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (message === 'EXPORT_EXPIRED') return NextResponse.json({ error: 'Export expired' }, { status: 410 });
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

