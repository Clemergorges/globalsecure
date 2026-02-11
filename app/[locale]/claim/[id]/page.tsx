"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Loader2, CheckCircle, Lock } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function ClaimPage() {
  const { id } = useParams();
  const router = useRouter();
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/claim/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.transfer) setTransfer(data.transfer);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="animate-spin" /></div>;
  if (!transfer) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white">Transfer not found</div>;

  const card = transfer.virtualCards?.[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <CardTitle>Money Received!</CardTitle>
          <CardDescription>
            {transfer.sender.fullName} sent you money.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency(Number(transfer.amountTarget), transfer.currencyTarget)}
            </div>
            <p className="text-sm text-slate-500">
              Sent: {formatCurrency(Number(transfer.amountSource), transfer.currencySource)}
            </p>
          </div>

          {card && (
            <div className="bg-slate-800 p-4 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Virtual Card</span>
                <span className="text-xs bg-blue-500 px-2 py-0.5 rounded text-white">{card.status}</span>
              </div>
              
              <div className="flex justify-center py-4 bg-white rounded">
                <QRCodeCanvas value={`https://globalsecuresend.com/card/${card.id}`} size={128} />
              </div>

              <div className="text-center text-sm text-slate-400">
                Scan to add to wallet or view details
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                 <span className="font-mono">**** **** **** {card.last4}</span>
                 <Lock className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button className="w-full bg-blue-600" onClick={() => router.push('/register')}>
              Create Account to Manage Funds
            </Button>
            <Button variant="outline" className="w-full border-slate-700" onClick={() => window.print()}>
              Download Receipt
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-xs text-slate-500">
            Powered by GlobalSecureSend
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
