
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const kycSchema = z.object({
  documentType: z.enum(['passport', 'id_card', 'driver_license']),
  documentNumber: z.string().min(5),
  issuingCountry: z.string().length(2),
  // In a real app, these would be presigned URLs or file blobs
  // For MVP simulation, we accept base64 or mock URLs
  frontImageUrl: z.string().url().or(z.string().min(10)), 
  backImageUrl: z.string().url().or(z.string().min(10)).optional(),
  selfieUrl: z.string().url().or(z.string().min(10)).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = kycSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error }, { status: 400 });
    }

    const { documentType, documentNumber, issuingCountry, frontImageUrl, backImageUrl, selfieUrl } = result.data;

    // Create KYC Document Record
    await prisma.kYCDocument.create({
      data: {
        // @ts-ignore
        userId: session.userId,
        documentType,
        documentNumber,
        issuingCountry,
        frontImageUrl,
        backImageUrl,
        selfieUrl,
        status: 'PENDING'
      }
    });

    // Update User Status to PENDING
    await prisma.user.update({
      // @ts-ignore
      where: { id: session.userId },
      data: {
        kycStatus: 'PENDING',
        kycLevel: 0 // Reset level until approved
      }
    });

    return NextResponse.json({ success: true, status: 'PENDING' });

  } catch (error) {
    console.error('KYC Upload failed:', error);
    return NextResponse.json({ error: 'KYC submission failed' }, { status: 500 });
  }
}
