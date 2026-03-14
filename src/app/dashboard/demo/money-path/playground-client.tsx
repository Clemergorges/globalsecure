'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Corridor = 'EU_BR_FIAT' | 'BR_EU_FIAT' | 'EU_BR_CRYPTO' | 'BR_EU_CRYPTO' | 'EU_EU' | 'BR_BR';

export default function MoneyPathPlaygroundClient() {
  const t = useTranslations('MoneyPath');
  const router = useRouter();
  const [corridor, setCorridor] = useState<Corridor>('EU_BR_FIAT');
  const [amount, setAmount] = useState<string>('1000');
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const defaults = useMemo(() => {
    if (corridor === 'EU_BR_FIAT') return { currency: 'EUR', placeholder: '1000' };
    if (corridor === 'BR_EU_FIAT') return { currency: 'BRL', placeholder: '5000' };
    if (corridor === 'EU_BR_CRYPTO') return { currency: 'EUR', placeholder: '1000' };
    if (corridor === 'BR_EU_CRYPTO') return { currency: 'BRL', placeholder: '5000' };
    if (corridor === 'EU_EU') return { currency: 'EUR', placeholder: '250' };
    return { currency: 'BRL', placeholder: '250' };
  }, [corridor]);

  async function onSimulate() {
    setLoading(true);
    setErrorCode(null);
    try {
      const res = await fetch('/api/demo/money-path/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ corridor, amount }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorCode(String(json?.code || 'ERROR'));
        return;
      }
      const transferId = String(json?.transferId || '');
      if (!transferId) {
        setErrorCode('MISSING_TRANSFER_ID');
        return;
      }
      router.push(`/dashboard/demo/money-path/${transferId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{t('playground.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('playground.subtitle')}</p>
        </div>
        <Badge variant="secondary">{t('playground.badgeDemo')}</Badge>
      </div>

      <Card className="mt-8 p-6 bg-white/5 border-white/10 backdrop-blur">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <Label>{t('playground.corridorLabel')}</Label>
            <Select value={corridor} onValueChange={(v) => setCorridor(v as Corridor)}>
              <SelectTrigger className="bg-black/20 border-white/10">
                <SelectValue placeholder={t('playground.corridorPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EU_BR_FIAT">{t('corridors.EU_BR_FIAT')}</SelectItem>
                <SelectItem value="BR_EU_FIAT">{t('corridors.BR_EU_FIAT')}</SelectItem>
                <SelectItem value="EU_BR_CRYPTO">{t('corridors.EU_BR_CRYPTO')}</SelectItem>
                <SelectItem value="BR_EU_CRYPTO">{t('corridors.BR_EU_CRYPTO')}</SelectItem>
                <SelectItem value="EU_EU">{t('corridors.EU_EU')}</SelectItem>
                <SelectItem value="BR_BR">{t('corridors.BR_BR')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('playground.amountLabel')}</Label>
            <Input
              value={amount}
              placeholder={defaults.placeholder}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-black/20 border-white/10"
            />
            <div className="text-xs text-muted-foreground">
              {t('playground.amountHint', { currency: defaults.currency })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {errorCode ? <div className="text-sm text-red-300">{t('errors.generic', { code: errorCode })}</div> : null}
            <Button onClick={onSimulate} disabled={loading}>
              {loading ? t('playground.simulateLoading') : t('playground.simulate')}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <div className="text-white/90 font-medium">{t('playground.cards.realtimeTitle')}</div>
            <div className="mt-1">{t('playground.cards.realtimeBody')}</div>
          </div>
          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <div className="text-white/90 font-medium">{t('playground.cards.aiTitle')}</div>
            <div className="mt-1">{t('playground.cards.aiBody')}</div>
          </div>
          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <div className="text-white/90 font-medium">{t('playground.cards.didacticTitle')}</div>
            <div className="mt-1">{t('playground.cards.didacticBody')}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

