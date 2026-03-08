'use client';

import { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';
import { useTranslations } from 'next-intl';

type TravelModeState = { travelModeEnabled: boolean; travelRegion: string | null };

function logDevError(message: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, err);
  }
}

export function TravelModeHeaderIcon() {
  if (process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED !== 'true') return null;

  const t = useTranslations('Incidents.travelMode');
  const [state, setState] = useState<TravelModeState | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/user/travel-mode', { method: 'GET' })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setState({ travelModeEnabled: Boolean(j?.travelModeEnabled), travelRegion: typeof j?.travelRegion === 'string' ? j.travelRegion : null });
      })
      .catch((e) => {
        if (!mounted) return;
        logDevError('Failed to fetch travel mode for header icon', e);
        setState(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!state?.travelModeEnabled) return null;

  const label = t('active');

  return (
    <div className="flex justify-end px-6 pt-4" aria-label={label}>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-200">
        <Plane className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-wide">{label}</span>
      </div>
    </div>
  );
}
