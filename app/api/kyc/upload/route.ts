import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const documentType = formData.get('documentType') as string;
    const documentNumber = formData.get('documentNumber') as string;
    const issuingCountry = formData.get('issuingCountry') as string;
    
    const frontImage = formData.get('frontImage') as File;
    const backImage = formData.get('backImage') as File | null;
    const selfieImage = formData.get('selfieImage') as File | null;

    if (!frontImage || !documentNumber || !issuingCountry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = (session as any).userId;
    // Upload Front Image (Secure Blob)
    // access: 'public' is required for Vercel Blob free tier, 
    // but the URL is random and hard to guess. 
    // For stricter security, we would use S3 presigned URLs, but Vercel Blob is good for MVP.
    const frontBlob = await put(`kyc/${userId}/front-${frontImage.name}`, frontImage, {
      access: 'public',
    });

    let backBlobUrl = null;
    if (backImage) {
      const backBlob = await put(`kyc/${userId}/back-${backImage.name}`, backImage, {
        access: 'public',
      });
      backBlobUrl = backBlob.url;
    }

    let selfieBlobUrl = null;
    if (selfieImage) {
      const selfieBlob = await put(`kyc/${userId}/selfie-${selfieImage.name}`, selfieImage, {
        access: 'public',
      });
      selfieBlobUrl = selfieBlob.url;
    }

    // Save metadata to DB
    await prisma.kYCDocument.create({
      data: {
        // @ts-ignore
        userId: session.userId,
        documentType,
        documentNumber,
        issuingCountry,
        frontImageUrl: frontBlob.url,
        backImageUrl: backBlobUrl,
        selfieUrl: selfieBlobUrl,
        status: 'PENDING'
      }
    });

    // Update User Status
    await prisma.user.update({
      // @ts-ignore
      where: { id: session.userId },
      data: {
        kycStatus: 'PENDING',
        kycLevel: 1 // Level 1 Submitted
      }
    });

    return NextResponse.json({ success: true, status: 'PENDING' });

  } catch (error) {
    console.error('KYC Upload failed:', error);
    return NextResponse.json({ error: 'KYC submission failed' }, { status: 500 });
  }
}