import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session || typeof session === 'string' || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // @ts-ignore
  const userId = session.userId;

  try {
    const formData = await req.formData();
    const documentType = formData.get('documentType') as string;
    const documentNumber = formData.get('documentNumber') as string;
    const issuingCountry = formData.get('issuingCountry') as string;
    
    // Note: Frontend now sends 'frontImage', 'backImage', 'selfieImage'
    const front = formData.get('frontImage') as File;
    const back = formData.get('backImage') as File;
    const selfie = formData.get('selfieImage') as File;

    if (!front || !back || !selfie || !documentNumber) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const frontBlob = await put(`kyc/${userId}/front-${front.name}`, front, { access: 'public' });
    const backBlob = await put(`kyc/${userId}/back-${back.name}`, back, { access: 'public' });
    const selfieBlob = await put(`kyc/${userId}/selfie-${selfie.name}`, selfie, { access: 'public' });

    // Create KYCDocument (Historical Record)
    await prisma.kYCDocument.create({
        data: {
            userId,
            documentType: documentType || 'id_card',
            documentNumber,
            issuingCountry: issuingCountry || 'LU',
            frontImageUrl: frontBlob.url,
            backImageUrl: backBlob.url,
            selfieUrl: selfieBlob.url,
            status: 'PENDING'
        }
    });

    // Update/Create KycVerification (Active State)
    await prisma.kycVerification.upsert({
      where: { userId },
      update: {
        status: 'PENDING',
        documentType: documentType || 'id_card',
        submittedAt: new Date(),
        rejectionReason: null
      },
      create: {
        userId,
        status: 'PENDING',
        documentType: documentType || 'id_card',
        level: 'BASIC',
        submittedAt: new Date()
      }
    });

    // Update User KYC Status
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'PENDING',
      }
    });

    // Notify User
    await createNotification({
      userId: userId,
      title: 'Documentos em Análise',
      body: 'Recebemos seus documentos. Nossa equipe fará a validação em breve.',
      type: 'INFO'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('KYC Submit Error:', error);
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 });
  }
}