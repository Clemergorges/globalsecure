'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRight, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFeeConfig } from '@/hooks/useFeeConfig';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function CreateTransferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('Transfers.Create');
  const tc = useTranslations('Common');
  const feeCfg = useFeeConfig();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    toEmail: '',
    amount: '',
    currency: 'EUR',
    enableYield: false
  });

  const feePct = feeCfg.data.remittance_fee_percent / 100;
  const feeSourceLabel = tc(`feeConfig.source.${feeCfg.data.source}` as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/transfers/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: formData.toEmail,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          enableYield: formData.enableYield
        })
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const code = (data as any)?.code as string | undefined;
        let message: string | undefined;
        if (code) {
          try {
            message = t(`errors.${code}` as any);
          } catch {}
        }
        if (!message) {
          message =
            (data as any)?.message ||
            (data as any)?.error ||
            (res.status >= 500 ? t('errors.INTERNAL_SERVER_ERROR') : t('errors.submitFailed'));
        }

        throw new Error(message);
      }

      setSuccess(true);
      toast({
        title: t('toast.sentTitle'),
        description: t('toast.sentDescription', { currency: formData.currency, amount: formData.amount, email: formData.toEmail }),
      });
      
      // Reset form partially
      setFormData(prev => ({ ...prev, amount: '' }));
      
    } catch (err: any) {
      setError(err.message);
      toast({
        title: tc('error'),
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6">
        <Card className="bg-[#111116] border-emerald-500/20 shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)]">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('success.title')}</h2>
              <p className="text-slate-400">{t('success.subtitle', { email: formData.toEmail })}</p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {t('success.backHome')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSuccess(false)}
                className="w-full border-white/10 text-slate-300 hover:bg-white/5"
              >
                {t('success.newTransfer')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
        <p className="text-slate-400">{t('subtitle')}</p>
      </div>

      <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-white">{t('detailsTitle')}</CardTitle>
            <CardDescription className="text-slate-500">
              {t('detailsDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-white border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">{t('recipientEmail')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('recipientEmailPlaceholder')}
                required
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
                value={formData.toEmail}
                onChange={(e) => setFormData({...formData, toEmail: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-slate-300">{t('amount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-slate-300">{t('currency')}</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(val) => setFormData({...formData, currency: val})}
                >
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder={t('selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0F] border-white/10 text-white">
                    <SelectItem value="EUR">{t('currencies.eur')}</SelectItem>
                    <SelectItem value="USD">{t('currencies.usd')}</SelectItem>
                    <SelectItem value="GBP">{t('currencies.gbp')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-cyan-950/10 p-4 rounded-lg border border-cyan-500/10">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-400">{t('serviceFee', { percent: (feePct * 100).toFixed(2) })}</span>
                <span className="text-slate-300 font-mono">
                  {formData.amount ? (parseFloat(formData.amount) * feePct).toFixed(2) : '0.00'} {formData.currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                <span>
                  {feeSourceLabel}
                  {feeCfg.isFallback ? (
                    <span className="ml-2 inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                      {tc('feeConfig.estimate')}
                    </span>
                  ) : null}
                </span>
                {feeCfg.error ? <span>{tc('feeConfig.fallbackNotice')}</span> : null}
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-cyan-500/10">
                <span className="text-cyan-400">{t('totalToPay')}</span>
                <span className="text-white font-mono">
                  {formData.amount ? (parseFloat(formData.amount) * (1 + feePct)).toFixed(2) : '0.00'} {formData.currency}
                </span>
              </div>
            </div>
            {feeCfg.loading ? <div className="text-xs text-slate-500">{tc('feeConfig.loading')}</div> : null}
            <div className="text-xs text-slate-500">
              {tc('disclaimer.tax')}
            </div>

            {process.env.NEXT_PUBLIC_YIELD_UI_ENABLED === 'true' ? (
              <>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="enableYield"
                    checked={formData.enableYield}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableYield: checked === true })}
                  />
                  <Label htmlFor="enableYield" className="text-slate-300">
                    {t('enableYield')}
                  </Label>
                </div>
                <div className="text-xs text-slate-500 pl-7">
                  {t('enableYieldHelp')}{' '}
                  <Link href="/dashboard/yield" className="text-emerald-400 hover:text-emerald-300 font-medium">
                    {t('enableYieldView')}
                  </Link>
                </div>
              </>
            ) : null}
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white hover:bg-white/5"
            >
              {tc('cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={loading || feeCfg.loading || !formData.toEmail || !formData.amount}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold min-w-[140px] shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <span className="flex items-center">
                  {t('submit')} <ArrowRight className="w-4 h-4 ml-2" />
                </span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
