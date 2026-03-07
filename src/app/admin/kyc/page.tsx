import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminKYCClient from './client';

export default async function AdminKYCPage() {
  const session = await getSession();
  if (!session || typeof session === 'string' || !session.userId) {
    redirect('/login');
  }

  // Fetch pending KYC requests
  // We want users with kycStatus = 'PENDING' and their latest KYCDocument
  const pendingUsers = await prisma.user.findMany({
    where: {
      kycStatus: 'PENDING'
    },
    include: {
      kycDocuments: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin: Aprovação de KYC</h1>
      <AdminKYCClient users={pendingUsers} />
    </div>
  );
}
