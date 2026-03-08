'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plane } from 'lucide-react';

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

type TravelModeResponse =
  | { error?: string }
  | { travelModeEnabled: boolean; travelRegion: string | null };

function logDevError(message: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, err);
  }
}

export function OperationalBanners() {
  const t = useTranslations('Incidents');
  const [flags, setFlags] = useState<FlagsResponse | null>(null);
  const [travel, setTravel] = useState<{ enabled: boolean; country: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/ops/flags')
      .then((r) => r.json())
      .then((j) => setFlags(j))
      .catch(() => setFlags({ ok: false, code: 'UNKNOWN' }));
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED !== 'true') return;
    let mounted = true;
    fetch('/api/user/travel-mode', { method: 'GET' })
      .then((r) => r.json())
      .then((j: TravelModeResponse) => {
        if (!mounted) return;
        const enabled = Boolean((j as any)?.travelModeEnabled);
        const country = typeof (j as any)?.travelRegion === 'string' ? ((j as any).travelRegion as string) : null;
        setTravel({ enabled, country });
      })
      .catch((e) => {
        if (!mounted) return;
        logDevError('Failed to fetch travel mode for banner', e);
        setTravel(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!flags || !flags.ok) return null;

  return (
    <div className="px-6 py-4 space-y-3">
      {process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED === 'true' && travel?.enabled && (
        <Alert className="bg-cyan-950/15 border-cyan-500/25 text-slate-100">
          <AlertTitle className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            {t('travelMode.bannerTitle')}
          </AlertTitle>
          <AlertDescription className="text-slate-200/90">
            {t('travelMode.bannerDescription', { country: travel.country || t('travelMode.unknownCountry') })}
          </AlertDescription>
        </Alert>
      )}
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
