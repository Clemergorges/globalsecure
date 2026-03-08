'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plane } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TravelModeState = {
  travelModeEnabled: boolean;
  travelRegion: string | null;
  summary?: string;
};

type GeoState = { country: string; currency: string };

function logDevError(message: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, err);
  }
}

function isIso2Country(code: string) {
  return /^[A-Z]{2}$/.test(code.trim().toUpperCase());
}

const COUNTRY_OPTIONS: Array<{ code: string; labelKey: string }> = [
  { code: 'BR', labelKey: 'countries.br' },
  { code: 'US', labelKey: 'countries.us' },
  { code: 'GB', labelKey: 'countries.gb' },
  { code: 'PT', labelKey: 'countries.pt' },
  { code: 'DE', labelKey: 'countries.de' },
  { code: 'FR', labelKey: 'countries.fr' },
  { code: 'ES', labelKey: 'countries.es' },
  { code: 'IT', labelKey: 'countries.it' },
  { code: 'NL', labelKey: 'countries.nl' },
  { code: 'LU', labelKey: 'countries.lu' },
];

export default function TravelModeToggle() {
  if (process.env.NEXT_PUBLIC_TRAVEL_MODE_ENABLED !== 'true') return null;

  const t = useTranslations('Settings.TravelMode');
  const tc = useTranslations('Common');
  const tCountries = useTranslations('Common.countries');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [countryCode, setCountryCode] = useState<string>('');
  const [usingEstimate, setUsingEstimate] = useState(false);

  const displayCountry = useMemo(() => {
    const c = (countryCode || '').trim().toUpperCase();
    if (!c) return t('country.none');
    try {
      return tCountries(c.toLowerCase() as any);
    } catch {
      return c;
    }
  }, [countryCode, tCountries, t]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [travelRes, geoRes] = await Promise.all([
          fetch('/api/user/travel-mode', { method: 'GET' }),
          fetch('/api/geo', { method: 'GET' }),
        ]);

        const travelBody = (await travelRes.json().catch(() => null)) as TravelModeState | null;
        const geoBody = (await geoRes.json().catch(() => null)) as GeoState | null;

        if (!mounted) return;

        const travelEnabled = Boolean(travelBody?.travelModeEnabled);
        const travelRegion = typeof travelBody?.travelRegion === 'string' ? travelBody?.travelRegion : null;

        setEnabled(travelEnabled);
        if (travelRegion && isIso2Country(travelRegion)) {
          setCountryCode(travelRegion);
        } else if (geoBody?.country && isIso2Country(geoBody.country)) {
          setCountryCode(geoBody.country.toUpperCase());
        }
        setUsingEstimate(!travelRes.ok);
      } catch (e) {
        if (!mounted) return;
        setUsingEstimate(true);
        logDevError('Failed to load travel mode state', e);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function persist(nextEnabled: boolean, nextCountry: string) {
    setSaving(true);
    try {
      const payload: { enabled: boolean; countryCode?: string } = { enabled: nextEnabled };
      const cc = (nextCountry || '').trim().toUpperCase();
      if (nextEnabled && cc) payload.countryCode = cc;

      const res = await fetch('/api/user/travel-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(body?.error || 'FAILED');

      setEnabled(Boolean(body?.travelModeEnabled));
      const region = typeof body?.travelRegion === 'string' ? body.travelRegion : null;
      if (region && isIso2Country(region)) setCountryCode(region);
      setUsingEstimate(false);
    } catch (e) {
      setUsingEstimate(true);
      logDevError('Failed to persist travel mode', e);
      alert(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const canToggle = !loading && !saving;
  const canSelectCountry = enabled && !loading && !saving;

  return (
    <Card className="bg-[#111116] border-white/5 backdrop-blur-sm md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-[var(--color-primary)]" />
          <CardTitle className="text-white">{t('title')}</CardTitle>
        </div>
        <CardDescription className="text-slate-400">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-[#1a1a1f] border-white/10">
          <div className="space-y-1">
            <Label className="text-base text-slate-300">{t('toggleLabel')}</Label>
            <p className="text-sm text-slate-400">
              {enabled
                ? t('toggleOnHelp', { country: displayCountry })
                : t('toggleOffHelp')}
              {usingEstimate ? ` ${t('estimate')}` : ''}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => persist(v, countryCode)}
            disabled={!canToggle}
            aria-label={t('toggleLabel')}
          />
        </div>

        {enabled && (
          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="travel-country">
              {t('country.label')}
            </Label>
            <Select
              value={countryCode || ''}
              onValueChange={(v) => {
                setCountryCode(v);
                persist(true, v);
              }}
              disabled={!canSelectCountry}
            >
              <SelectTrigger id="travel-country" className="bg-black/20 border-white/10 text-white">
                <SelectValue placeholder={t('country.placeholder')} />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0F] border-white/10 text-white">
                {COUNTRY_OPTIONS.map((o) => (
                  <SelectItem key={o.code} value={o.code}>
                    {(() => {
                      try {
                        return tCountries(o.code.toLowerCase() as any);
                      } catch {
                        return o.code;
                      }
                    })()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-slate-500">{tc('disclaimer.tax')}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
