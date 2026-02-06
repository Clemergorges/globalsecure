import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string' || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.userId;

  try {
    const formData = await req.formData();
    const documentType = formData.get('documentType') as string;
    const documentNumber = formData.get('documentNumber') as string;
    const issuingCountry = formData.get('issuingCountry') as string;
    
    const front = formData.get('front') as File;
    const back = formData.get('back') as File;
    const selfie = formData.get('selfie') as File;

    if (!front || !back || !selfie || !documentNumber) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Prepare upload directory (Local Storage for MVP)
    // Note: In production (Vercel), this should be replaced by Vercel Blob or S3
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'kyc', userId);
    await mkdir(uploadDir, { recursive: true });

    // Helper to save file
    const saveFile = async (file: File, prefix: string) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        // Clean filename extension
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${prefix}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);
        // Return URL relative to public
        return `/uploads/kyc/${userId}/${filename}`;
    };

    const frontUrl = await saveFile(front, 'front');
    const backUrl = await saveFile(back, 'back');
    const selfieUrl = await saveFile(selfie, 'selfie');

    // Create KYCDocument
    await prisma.kYCDocument.create({
        data: {
            userId,
            documentType: documentType || 'id_card',
            documentNumber,
            issuingCountry: issuingCountry || 'LU',
            frontImageUrl: frontUrl,
            backImageUrl: backUrl,
            selfieUrl: selfieUrl,
            status: 'PENDING'
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
