'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, DollarSign, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycStatus: string;
  wallet: {
    balances: { currency: string; amount: string }[];
  };
  lastKycDoc?: {
    frontImageUrl: string;
    backImageUrl?: string;
    selfieUrl?: string;
    documentNumber: string;
  };
  createdAt: string;
}

export default function AdminDashboard() {
  const t = useTranslations('Admin');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403) {
        alert(t('accessDenied'));
        router.push('/dashboard');
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApproveKYC = async (userId: string, approve: boolean) => {
    if (!confirm(approve ? t('approveUser') : t('rejectUser'))) return;
    
    try {
        await fetch('/api/admin/kyc/approve', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                status: approve ? 'APPROVED' : 'REJECTED',
                rejectionReason: approve ? null : 'Documentos ilegíveis ou inválidos.'
            })
        });
        fetchUsers();
    } catch (e) {
        alert(t('kycUpdateError'));
    }
  };

  const handleTopUp = async (userId: string) => {
    const amount = prompt(t('enterDepositAmount'));
    if (!amount) return;
    const currency = prompt(t('enterCurrency'), 'EUR');
    if (!currency) return;

    try {
        await fetch('/api/admin/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                amount: parseFloat(amount),
                currency: currency.toUpperCase()
            })
        });
        alert(t('depositSuccess'));
        fetchUsers();
    } catch (e) {
        alert(t('depositError'));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('adminPanel')}</h1>
        <Button onClick={fetchUsers} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> {t('refresh')}</Button>
      </div>

      <div className="grid gap-6">
        {users.map(user => (
            <Card key={user.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>{user.firstName} {user.lastName}</CardTitle>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={user.kycStatus === 'APPROVED' ? 'default' : user.kycStatus === 'PENDING' ? 'secondary' : 'destructive'}>
                            KYC: {user.kycStatus}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Carteira */}
                        <div>
                            <h3 className="font-bold mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t('balances')}</h3>
                            <div className="space-y-1">
                                {user.wallet?.balances && user.wallet.balances.length > 0 ? (
                                    user.wallet.balances.map(b => (
                                        <div key={b.currency} className="flex justify-between p-2 bg-gray-100 rounded">
                                            <span>{b.currency}</span>
                                            <span className="font-mono font-bold">{b.amount}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 italic">{t('noBalances')}</p>
                                )}
                            </div>
                            <Button size="sm" className="mt-4 w-full" onClick={() => handleTopUp(user.id)}>
                                + {t('addManualBalance')}
                            </Button>
                        </div>

                        {/* KYC Docs */}
                        <div>
                            <h3 className="font-bold mb-2">{t('kycDocuments')}</h3>
                            {user.lastKycDoc ? (
                                <div className="space-y-2">
                                    <p className="text-sm">{t('document')}: {user.lastKycDoc.documentNumber}</p>
                                    <div className="flex gap-2 mt-2">
                                        <a href={user.lastKycDoc.frontImageUrl} target="_blank" className="text-blue-600 underline text-sm">{t('viewFront')}</a>
                                        {user.lastKycDoc.backImageUrl && <a href={user.lastKycDoc.backImageUrl} target="_blank" className="text-blue-600 underline text-sm">{t('viewBack')}</a>}
                                        {user.lastKycDoc.selfieUrl && <a href={user.lastKycDoc.selfieUrl} target="_blank" className="text-blue-600 underline text-sm">{t('viewSelfie')}</a>}
                                    </div>
                                    
                                    {user.kycStatus === 'PENDING' && (
                                        <div className="flex gap-2 mt-4">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveKYC(user.id, true)}>
                                                <CheckCircle className="w-4 h-4 mr-1" /> {t('approve')}
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleApproveKYC(user.id, false)}>
                                                <XCircle className="w-4 h-4 mr-1" /> {t('reject')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">{t('noDocumentsSubmitted')}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}