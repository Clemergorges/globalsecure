import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import PDFDocument from 'pdfkit';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    // Fetch transactions
    const transactions = await prisma.userTransaction.findMany({
      where: {
        userId: session.userId,
        createdAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined
        },
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    
    // Header
    doc.fontSize(20).text('GlobalSecureSend', { align: 'center' });
    doc.fontSize(14).text('Extrato de Conta', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10).text(`Cliente: ${session.email}`);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`);
    doc.text(`Período: ${from || 'Início'} até ${to || 'Hoje'}`);
    doc.moveDown();

    // Table Header
    const y = doc.y;
    doc.text('Data', 50, y);
    doc.text('Tipo', 150, y);
    doc.text('Valor', 300, y);
    doc.text('Moeda', 400, y);
    
    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    doc.moveDown();

    // Table Rows
    transactions.forEach((tx, i) => {
      const rowY = doc.y + 10;
      if (rowY > 700) {
          doc.addPage();
      }
      
      const date = new Date(tx.createdAt).toLocaleDateString();
      const type = tx.type.replace('_', ' ');
      const amount = Number(tx.amount).toFixed(2);
      
      doc.text(date, 50, rowY);
      doc.text(type, 150, rowY);
      doc.text(amount, 300, rowY);
      doc.text(tx.currency, 400, rowY);
    });

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="statement.pdf"'
      }
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}