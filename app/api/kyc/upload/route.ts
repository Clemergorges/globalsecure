import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { supabase, KYC_BUCKET } from '@/lib/supabase';

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

    // Helper to upload to Supabase Storage
    const uploadToSupabase = async (file: File, prefix: string) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${prefix}-${Date.now()}.${fileExt}`;
      const buffer = await file.arrayBuffer();

      const { data, error } = await supabase.storage
        .from(KYC_BUCKET)
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true
        });

      if (error) {
        console.error(`Supabase Upload Error (${prefix}):`, error);
        throw new Error(`Storage upload failed: ${error.message}`);
      }
      return data.path; // Store the path, not the public URL
    };

    // Upload Files
    console.log('Starting uploads...');
    const frontPath = await uploadToSupabase(frontImage, 'front');
    console.log('Front uploaded:', frontPath);
    
    let backPath = null;
    if (backImage) {
      backPath = await uploadToSupabase(backImage, 'back');
    }

    let selfiePath = null;
    if (selfieImage) {
      selfiePath = await uploadToSupabase(selfieImage, 'selfie');
    }

    // Save metadata to DB
    console.log('Saving to DB...');
    // Note: We are storing PATHS now, not public URLs.
    // The field names in Prisma are still '...Url', but we will treat them as paths for Supabase.
    await prisma.kYCDocument.create({
      data: {
        // @ts-ignore
        userId: session.userId,
        documentType,
        documentNumber,
        issuingCountry,
        frontImageUrl: frontPath, // Storing PATH
        backImageUrl: backPath,   // Storing PATH
        selfieUrl: selfiePath,    // Storing PATH
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