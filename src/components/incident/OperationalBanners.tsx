'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FlagsResponse =
  | { ok: false; code?: string }
  | {
      ok: true;
      flags: {
        TREASURY_HALT_DEPOSITS_WITHDRAWS: boolean;
        YIELD_ALLOCATIONS_PAUSED: boolean;
        PARTNER_OUTAGE?: boolean;
      };
    };

export function OperationalBanners() {
  const t = useTranslations('Incidents');
  const [flags, setFlags] = useState<FlagsResponse | null>(null);

  useEffect(() => {
    fetch('/api/ops/flags')
      .then((r) => r.json())
      .then((j) => setFlags(j))
      .catch(() => setFlags({ ok: false, code: 'UNKNOWN' }));
  }, []);

  if (!flags || !flags.ok) return null;

  return (
    <div className="px-6 py-4 space-y-3">
      {flags.flags.TREASURY_HALT_DEPOSITS_WITHDRAWS && (
        <Alert variant="destructive" className="bg-red-950/20 border-red-500/30 text-red-200">
          <AlertTitle>{t('treasuryHalt.title')}</AlertTitle>
          <AlertDescription>{t('treasuryHalt.description')}</AlertDescription>
        </Alert>
      )}
      {flags.flags.YIELD_ALLOCATIONS_PAUSED && (
        <Alert variant="destructive" className="bg-amber-950/20 border-amber-500/30 text-amber-100">
          <AlertTitle>{t('yieldPaused.title')}</AlertTitle>
          <AlertDescription>{t('yieldPaused.description')}</AlertDescription>
        </Alert>
      )}
      {flags.flags.PARTNER_OUTAGE && (
        <Alert variant="destructive" className="bg-slate-950/20 border-white/15 text-slate-100">
          <AlertTitle>{t('partnerOutage.title')}</AlertTitle>
          <AlertDescription>{t('partnerOutage.description')}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
