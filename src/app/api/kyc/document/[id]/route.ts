import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withRouteContext } from '@/lib/http/route';
import { logAudit } from '@/lib/logger';
import { getSupabase, KYC_BUCKET } from '@/lib/supabase';
import { SupabasePrivateKycStorage } from '@/lib/kyc/storage/providers/SupabasePrivateKycStorage';

let cachedKycStorage: SupabasePrivateKycStorage | null = null;
function kycStorage() {
  if (cachedKycStorage) return cachedKycStorage;
  cachedKycStorage = new SupabasePrivateKycStorage(getSupabase() as any, KYC_BUCKET);
  return cachedKycStorage;
}

async function getSignedUrl(key: string | null) {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return null;
  }
  return kycStorage().getSignedReadUrl({ key, expiresInSeconds: 60 * 15 });
}

function isPrivilegedRole(role: string | null) {
  return role === 'ADMIN' || role === 'COMPLIANCE' || role === 'TREASURY';
}

export const GET = withRouteContext(async (req: NextRequest, ctx) => {
  const documentId = req.nextUrl.pathname.split('/').pop() || '';
  if (!documentId) return NextResponse.json({ error: 'Validation Error' }, { status: 400 });

  const isAdmin = isPrivilegedRole(ctx.role);

  const doc = await prisma.kYCDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (doc.userId !== ctx.userId && !isAdmin) {
    logAudit({
      userId: ctx.userId!,
      action: 'KYC_DOCUMENT_FORBIDDEN',
      status: '403',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      method: ctx.method,
      path: ctx.path,
      metadata: { requestId: ctx.requestId, documentId },
    }).catch(() => {});
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [frontUrl, backUrl, selfieUrl] = await Promise.all([
    getSignedUrl(doc.frontImageUrl),
    getSignedUrl(doc.backImageUrl),
    getSignedUrl(doc.selfieUrl),
  ]);

  logAudit({
    userId: ctx.userId!,
    action: 'KYC_DOCUMENT_READ',
    status: '200',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    method: ctx.method,
    path: ctx.path,
    metadata: { requestId: ctx.requestId, documentId, asAdmin: isAdmin },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    document: {
      ...doc,
      frontImageUrl: frontUrl,
      backImageUrl: backUrl,
      selfieUrl,
    },
  });
});
