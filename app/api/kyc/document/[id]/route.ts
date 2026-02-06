
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, checkAdmin } from '@/lib/auth';
import { supabase, KYC_BUCKET } from '@/lib/supabase';

// Helper function to get signed URL
async function getSignedUrl(path: string | null) {
  if (!path) return null;
  // If the stored value is already a full URL (legacy/vercel blob), return it as is
  if (path.startsWith('http')) return path;

  const { data, error } = await supabase.storage
    .from(KYC_BUCKET)
    .createSignedUrl(path, 60 * 15); // Valid for 15 minutes

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  return data.signedUrl;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const documentId = params.id;
  const isAdmin = await checkAdmin();
  const userId = (session as any).userId;

  // Fetch document
  const doc = await prisma.kYCDocument.findUnique({
    where: { id: documentId }
  });

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Security Check: Only the owner OR admin can access
  if (doc.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Generate Signed URLs for all images
  const [frontUrl, backUrl, selfieUrl] = await Promise.all([
    getSignedUrl(doc.frontImageUrl),
    getSignedUrl(doc.backImageUrl),
    getSignedUrl(doc.selfieUrl)
  ]);

  return NextResponse.json({
    success: true,
    document: {
      ...doc,
      frontImageUrl: frontUrl,
      backImageUrl: backUrl,
      selfieUrl: selfieUrl
    }
  });
}
