
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/logger';

const documentSchema = z.object({
  documentType: z.enum(['PASSPORT', 'NATIONAL_ID', 'RESIDENCE_PERMIT', 'DRIVERS_LICENSE']),
  documentNumber: z.string().min(5),
  documentExpiry: z.string().optional(), // ISO Date String
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = documentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { documentType, documentNumber, documentExpiry } = parsed.data;

    // Validate if document number already used by another user (unique constraint)
    const existing = await prisma.user.findUnique({
      where: { documentNumber }
    });

    if (existing && existing.id !== session.userId) {
      return NextResponse.json({ error: 'Este número de documento já está em uso.' }, { status: 409 });
    }

    // Update User Document Info
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        documentType,
        documentNumber,
        documentExpiry: documentExpiry ? new Date(documentExpiry) : null,
        kycStatus: 'PENDING', // Trigger Review
        kycLevel: 1 // Level 1 (Document submitted)
      }
    });

    // Create KYC Document Record for Audit
    await prisma.kYCDocument.create({
      data: {
        userId: session.userId,
        documentType,
        documentNumber,
        issuingCountry: 'UNKNOWN', // Should ideally come from request
        status: 'PENDING'
      }
    });

    // Update Account Status if it was UNVERIFIED
    await prisma.account.update({
      where: { userId: session.userId },
      data: { status: 'PENDING' } // Pending Review
    });

    await logAudit({
        userId: session.userId,
        action: 'KYC_SUBMITTED',
        status: 'SUCCESS',
        metadata: { type: documentType }
    });

    return NextResponse.json({ 
        success: true, 
        message: "Documento enviado para análise.",
        status: 'PENDING'
    });

  } catch (error) {
    console.error('Onboarding Document Error:', error);
    return NextResponse.json({ error: 'Erro ao processar documento' }, { status: 500 });
  }
}
