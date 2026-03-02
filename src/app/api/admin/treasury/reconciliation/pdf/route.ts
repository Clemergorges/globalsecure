import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { checkAdmin } from '@/lib/auth';
import { runTreasuryReconciliation } from '@/lib/services/treasury-reconciliation';

export async function GET(req: Request) {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const maxAgeMin = searchParams.get('maxAgeMin');
  const snapshotMaxAgeMinutes = maxAgeMin ? Number(maxAgeMin) : undefined;

  const r = await runTreasuryReconciliation({ emitAudit: false, snapshotMaxAgeMinutes });

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  doc.fontSize(18).text('GlobalSecureSend', { align: 'center' });
  doc.fontSize(14).text('Treasury Reconciliation Report', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).text(`Run At: ${new Date(r.nowIso).toISOString()}`);
  doc.text(`Snapshot Cutoff: ${new Date(r.snapshotCutoffIso).toISOString()}`);
  doc.text(`Rows: ${r.rows.length}`);
  doc.text(`Alerts: ${r.alerts.length}`);
  doc.moveDown();

  const y = doc.y;
  doc.fontSize(10).text('CCY', 50, y);
  doc.text('Internal', 100, y);
  doc.text('External', 200, y);
  doc.text('Delta', 300, y);
  doc.text('%', 380, y);
  doc.text('Providers', 430, y);
  doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
  doc.moveDown();

  for (const row of r.rows) {
    const rowY = doc.y + 8;
    if (rowY > 720) doc.addPage();

    doc.text(row.currency, 50, rowY);
    doc.text(row.internalTotal, 100, rowY);
    doc.text(row.externalTotal ?? '-', 200, rowY);
    doc.text(row.delta ?? '-', 300, rowY);
    doc.text(row.divergencePct !== null ? row.divergencePct.toFixed(2) : '-', 380, rowY);
    doc.text(row.providers.join(' | ') || '-', 430, rowY, { width: 120 });
  }

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const date = new Date(r.nowIso).toISOString().split('T')[0];
  return new NextResponse(pdfBuffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="treasury-reconciliation-${date}.pdf"`,
    },
  });
}

