'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowDownLeft, QrCode, Building, Wallet, Euro } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { getUserProfile } from '@/app/actions/get-user-profile';

export default function DepositPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('WalletDeposit');
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  
  const [profile, setProfile] = useState<{ country: string, currency: string } | null>(null);
  const [activeTab, setActiveTab] = useState('crypto');

  useEffect(() => {
    getUserProfile().then(data => {
      if (data) {
        setProfile(data);
        // Set default tab based on country
        if (data.country === 'BR') setActiveTab('pix');
        else if (['LU', 'DE', 'FR', 'ES', 'PT', 'IT', 'NL', 'BE'].includes(data.country)) setActiveTab('sepa');
        else setActiveTab('crypto');
      }
    });
  }, []);

  const handlePixDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/wallet/deposit/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha no depósito');
      }

      toast({
        title: t('pixSuccessTitle'),
        description: t('pixSuccessDesc', { amount }),
      });
      
      router.push('/dashboard');
      router.refresh();
      
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-white" /></div>;
  }

  const showPix = profile.country === 'BR';
  const showSepa = ['LU', 'DE', 'FR', 'ES', 'PT', 'IT', 'NL', 'BE'].includes(profile.country) || profile.currency === 'EUR';

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
        <p className="text-slate-400">{t('subtitle')}</p>
        <div className="mt-2 text-sm text-slate-500">
          País: <span className="text-white font-medium">{profile.country}</span> • 
          Moeda: <span className="text-white font-medium">{profile.currency}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#111116] border border-white/5 p-1 h-auto">
          {showPix && (
            <TabsTrigger value="pix" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black py-3">
              <QrCode className="w-4 h-4 mr-2" /> {t('tabPix')}
            </TabsTrigger>
          )}
          {showSepa && (
            <TabsTrigger value="sepa" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3">
              <Euro className="w-4 h-4 mr-2" /> SEPA Instant
            </TabsTrigger>
          )}
          
          <TabsTrigger value="crypto" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white py-3">
            <Wallet className="w-4 h-4 mr-2" /> {t('tabCrypto')}
          </TabsTrigger>
          
          <TabsTrigger value="bank" className="data-[state=active]:bg-white data-[state=active]:text-black py-3">
            <Building className="w-4 h-4 mr-2" /> {t('tabBank')}
          </TabsTrigger>
        </TabsList>

        {/* PIX Tab */}
        {showPix && (
        <TabsContent value="pix">
          <Card className="bg-[#111116] border-white/5 mt-4 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                {t('pixTitle')}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {t('pixDesc')}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePixDeposit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pix-amount" className="text-slate-300">{t('pixAmountLabel')} ({profile.currency})</Label>
                  <Input
                    id="pix-amount"
                    type="number"
                    placeholder="0.00"
                    min="1"
                    required
                    className="bg-black/20 border-white/10 text-white focus:border-cyan-500/50 text-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="bg-cyan-900/10 p-4 rounded text-sm text-cyan-200 border border-cyan-500/10">
                  <p>{t('pixHint')}</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={loading || !amount}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('pixSubmit')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        )}

        {/* SEPA Tab */}
        {showSepa && (
        <TabsContent value="sepa">
          <Card className="bg-[#111116] border-white/5 mt-4 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Euro className="w-5 h-5 text-blue-400" />
                Depósito SEPA Instant
              </CardTitle>
              <CardDescription className="text-slate-500">
                Transferência instantânea em Euros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Beneficiário</span>
                  <span className="text-white font-medium">Global Secure Send Ltd.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">IBAN (LU)</span>
                  <span className="text-white font-mono">LU88 1234 5678 9012 3456</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">BIC</span>
                  <span className="text-white font-mono">GSSLULLL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Referência</span>
                  <span className="text-white font-mono font-bold text-yellow-400">DEPOSIT-{profile.country}</span>
                </div>
              </div>
              <div className="bg-blue-900/10 p-3 rounded text-sm text-blue-200 border border-blue-500/10">
                <p>⚠️ Importante: Inclua a referência na sua transferência para crédito automático.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Crypto Tab */}
        <TabsContent value="crypto">
          <Card className="bg-[#111116] border-white/5 mt-4 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">{t('cryptoTitle')}</CardTitle>
              <CardDescription className="text-slate-500">
                {t('cryptoDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="bg-white p-4 inline-block rounded-xl mb-4">
                {/* Placeholder QR */}
                <div className="w-32 h-32 bg-black/10" />
              </div>
              <p className="text-sm text-slate-400 mb-2">{t('cryptoAddressLabel')}</p>
              <code className="bg-black/30 px-3 py-1 rounded text-purple-400 font-mono text-sm block mb-4 break-all">
                0x71C7656EC7ab88b098defB751B7401B5f6d8976F
              </code>
              <p className="text-xs text-slate-500">
                {t('cryptoWarning')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Tab */}
        <TabsContent value="bank">
          <Card className="bg-[#111116] border-white/5 mt-4 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">{t('bankTitle')}</CardTitle>
              <CardDescription className="text-slate-500">
                {t('bankDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">{t('bankBeneficiaryLabel')}</span>
                  <span className="text-white font-medium">Global Secure Send Ltd.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">IBAN</span>
                  <span className="text-white font-mono">LU88 0000 0000 0000 0000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">BIC/SWIFT</span>
                  <span className="text-white font-mono">GSSLULLL</span>
                </div>
              </div>
              <div className="bg-amber-900/10 p-3 rounded text-sm text-amber-200 border border-amber-500/10">
                <p>{t('bankWarning')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
