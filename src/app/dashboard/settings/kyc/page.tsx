'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, Shield, Loader2, AlertCircle, ScanFace } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { SUPPORTED_KYC_COUNTRIES, isSupportedKycCountry, normalizeCountryCode } from '@/lib/kyc/supported-countries';
import {
  getDocumentLastFourErrorKey,
  getDocumentLastFourLabelKey,
  getDocumentLastFourPlaceholderKey,
  normalizeDocumentLastFour,
  validateDocumentLastFour,
} from '@/lib/kyc/document-last-four';

type StripeIdentityResponse =
  | { url: string; clientSecret?: string; id?: string }
  | { error?: string; code?: string };

type StripeIdentitySyncResponse =
  | { status: string; stripeStatus?: string; lastError?: unknown }
  | { error?: string };

function isStripeIdentitySuccess(payload: StripeIdentityResponse): payload is { url: string; clientSecret?: string; id?: string } {
  const url = (payload as { url?: unknown }).url;
  return typeof url === 'string' && url.length > 0;
}

function KYCContent() {
  const t = useTranslations('KYC');
  const tc = useTranslations('Common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [profileCountry, setProfileCountry] = useState<string | null>(null);
  const [lastFourTouched, setLastFourTouched] = useState(false);
  const [formData, setFormData] = useState({
    documentType: 'id_card',
    documentNumber: '',
    documentLastFour: '',
    issuingCountry: 'LU'
  });
  const [files, setFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});

  useEffect(() => {
    const querySessionId = searchParams.get('session_id');
    const storedSessionId =
      typeof window !== 'undefined' ? window.localStorage.getItem('kyc_stripe_session_id') : null;
    const sessionId = (querySessionId || storedSessionId || '').trim();

    if (sessionId) {
      fetch('/api/kyc/stripe-identity/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json().catch(() => ({})).then((data) => ({ ok: res.ok, data })))
        .then(({ ok, data }: { ok: boolean; data: StripeIdentitySyncResponse }) => {
          if (ok && (data as any)?.status === 'APPROVED') {
            setStep(5);
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('kyc_stripe_session_id');
            }
            return;
          }
          setStripeError(t('verificationInProgress'));
        })
        .catch(() => {
          setStripeError(t('verificationInProgress'));
        })
        .finally(() => {});
    }
    if (searchParams.get('kyc') === 'cancelled') {
      setStripeError(t('verificationCancelled'));
      setShowManualFallback(true);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('kyc_stripe_session_id');
      }
    }
  }, [searchParams, t]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        const raw = data?.user?.country;
        if (typeof raw === 'string' && raw.trim()) {
          const normalized = normalizeCountryCode(raw);
          setProfileCountry(normalized);
          setFormData((prev) => ({ ...prev, issuingCountry: normalized }));
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (key: 'front' | 'back' | 'selfie', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
    }
  };

  const mapStripeIdentityError = (code?: string) => {
    switch (code) {
      case 'KYC_COUNTRY_MISSING':
        return t('errors.countryMissing');
      case 'KYC_COUNTRY_INVALID':
        return t('errors.countryInvalid');
      case 'KYC_UNSUPPORTED_COUNTRY':
        return t('errors.unsupportedCountry');
      case 'KYC_STRIPE_IDENTITY_DISABLED':
        return t('errors.autoVerificationDisabled');
      case 'STRIPE_NOT_CONFIGURED':
        return t('errors.serviceUnavailable');
      default:
        return t('stripeConnectionError');
    }
  };

  const handleStripeIdentity = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
        const res = await fetch('/api/kyc/stripe-identity', { method: 'POST' });
        const data: StripeIdentityResponse = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStripeError(mapStripeIdentityError((data as any)?.code));
          setShowManualFallback(true);
          return;
        }
        if (isStripeIdentitySuccess(data)) {
            setStripeError(t('verificationRedirecting'));
            if (typeof window !== 'undefined' && typeof (data as any)?.id === 'string') {
              window.localStorage.setItem('kyc_stripe_session_id', (data as any).id);
            }
            window.location.href = data.url;
            return;
        }
        setStripeError(t('autoVerificationError'));
        setShowManualFallback(true);
    } catch (e) {
        setStripeError(t('stripeConnectionError'));
        setShowManualFallback(true);
    } finally {
        setStripeLoading(false);
    }
  };

  const countryIsSupported = profileCountry ? isSupportedKycCountry(profileCountry) : false;
  const countryIsMissing = !profileCountry;
  const lastFourIsValid =
    countryIsSupported && validateDocumentLastFour(formData.documentLastFour, profileCountry ?? '');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      // Dados do documento
      data.append('documentType', formData.documentType);
      data.append('documentNumber', formData.documentNumber);
      data.append('documentLastFour', normalizeDocumentLastFour(formData.documentLastFour));
      data.append('issuingCountry', formData.issuingCountry);
      
      // Arquivos
      if (files.front) data.append('frontImage', files.front);
      if (files.back) data.append('backImage', files.back);
      if (files.selfie) data.append('selfieImage', files.selfie);

      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        body: data,
      });

      if (res.ok) {
        setStep(5); // Sucesso
      } else {
        alert(t('documentSendError'));
      }
    } catch (error) {
      console.error(error);
      alert(t('connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 text-slate-100">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t('identityVerification')}</h1>
        <p className="text-slate-400">{t('verifyIdentityDescription')}</p>
      </div>

      {step === 5 ? (
        <Card className="border-emerald-500/20 bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('documentsSent')}</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {t('verificationInProgress')}
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              {t('backToDashboard')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
            {/* Opção Rápida (Stripe Identity) */}
            <Card className="mb-6 bg-[#111116] border-white/5 backdrop-blur-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    {t('recommended')}
                </div>
                <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center">
                            <ScanFace className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{t('automaticVerification')}</h3>
                            <p className="text-slate-400 text-sm">{t('useStripeIdentity')}</p>
                            <p className="text-slate-400 text-xs mt-2">{t('cameraHttpsHint')}</p>
                        </div>
                    </div>
                    <Button onClick={handleStripeIdentity} disabled={stripeLoading || loading || !countryIsSupported}>
                        {stripeLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('verificationRedirecting')}
                          </span>
                        ) : (
                          t('startNow')
                        )}
                    </Button>
                </CardContent>
                {(stripeError || showManualFallback) && (
                  <CardContent className="pt-0 pb-6 px-6">
                    {stripeError && (
                      <div className="mt-3 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-sm text-slate-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-cyan-400" />
                        <span>{stripeError}</span>
                      </div>
                    )}
                    {showManualFallback && (
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const el = document.getElementById('kyc-manual');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          {t('manualVerification')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
            </Card>

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">{t('manualSeparator')}</span>
                <div className="flex-grow border-t border-white/10"></div>
            </div>

            <Card id="kyc-manual" className="bg-[#111116] border-white/5 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                {[0, 1, 2, 3].map((s) => (
                    <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-cyan-400' : 'text-slate-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${step >= s ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
                        {s + 1}
                    </div>
                    {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-cyan-500/40' : 'bg-white/10'}`} />}
                    </div>
                ))}
                </div>
                <CardTitle>
                {step === 0 && t('stepDocumentDataTitle')}
                {step === 1 && t('stepFrontTitle')}
                {step === 2 && t('stepBackTitle')}
                {step === 3 && t('stepSelfieTitle')}
                </CardTitle>
                <CardDescription className="text-slate-400">
                {step === 0 && t('stepDocumentDataDesc')}
                {step === 1 && t('stepFrontDesc')}
                {step === 2 && t('stepBackDesc')}
                {step === 3 && t('stepSelfieDesc')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {step === 0 && (
                <div className="space-y-4">
                    <div>
                    <Label>{t('country.label')}</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.issuingCountry}
                        onChange={(e) => setFormData({ ...formData, issuingCountry: e.target.value })}
                        disabled={true}
                    >
                        {profileCountry && !isSupportedKycCountry(profileCountry) && (
                          <option value={profileCountry}>{t('countries.unknown', { code: profileCountry })}</option>
                        )}
                        {SUPPORTED_KYC_COUNTRIES.map((code) => (
                          <option key={code} value={code}>
                            {t(`countries.${code.toLowerCase()}` as any)}
                          </option>
                        ))}
                    </select>
                    {countryIsMissing ? (
                      <p className="text-xs text-red-400 mt-1">{t('errors.countryMissing')}</p>
                    ) : countryIsSupported ? (
                      <p className="text-xs text-slate-400 mt-1">{t('errors.countryLocked')}</p>
                    ) : (
                      <p className="text-xs text-red-400 mt-1">{t('country.unsupported')}</p>
                    )}
                    </div>
                    <div>
                    <Label>{t('documentType.label')}</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.documentType}
                        onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                        disabled={!countryIsSupported}
                    >
                        <option value="id_card">{t('docTypeIdCard')}</option>
                        <option value="passport">{t('docTypePassport')}</option>
                        <option value="driver_license">{t('docTypeDriverLicense')}</option>
                    </select>
                    </div>
                    <div>
                    <Label>{t('documentNumber')}</Label>
                    <Input 
                        value={formData.documentNumber}
                        onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                        placeholder={t('documentNumberPlaceholder')}
                    />
                    </div>
                    <div>
                    <Label>{t(getDocumentLastFourLabelKey(profileCountry ?? ''))}</Label>
                    <Input
                        value={formData.documentLastFour}
                        onChange={(e) =>
                          setFormData({ ...formData, documentLastFour: e.target.value })
                        }
                        onBlur={() => setLastFourTouched(true)}
                        placeholder={t(getDocumentLastFourPlaceholderKey(profileCountry ?? ''))}
                        inputMode={profileCountry?.toUpperCase() === 'US' ? 'numeric' : 'text'}
                        pattern={profileCountry?.toUpperCase() === 'US' ? '\\d{4}' : '[A-Za-z0-9]{4}'}
                        maxLength={4}
                        disabled={!countryIsSupported}
                    />
                    {countryIsSupported && lastFourTouched && !lastFourIsValid && (
                      <p className="text-xs text-red-500 mt-1">
                        {t(getDocumentLastFourErrorKey(profileCountry ?? ''))}
                      </p>
                    )}
                    </div>
                </div>
                )}

                {step > 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                    <Input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleFileChange(step === 1 ? 'front' : step === 2 ? 'back' : 'selfie', e)}
                    />
                    <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{t('uploadSelectOrDrop')}</p>
                        <p className="text-sm text-gray-500 mt-1">{t('uploadFormats')}</p>
                    </div>
                    {((step === 1 && files.front) || (step === 2 && files.back) || (step === 3 && files.selfie)) && (
                        <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('fileSelected')}
                        </div>
                    )}
                    </div>
                </div>
                )}

                <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || loading}>
                    {tc('back')}
                </Button>
                
                {step < 3 ? (
                    <Button 
                    onClick={() => setStep(s => s + 1)} 
                    disabled={
                        (step === 0 && (!formData.documentNumber || !countryIsSupported || !lastFourIsValid)) ||
                        (step === 1 && !files.front) || 
                        (step === 2 && !files.back)
                    }
                    >
                    {tc('next')}
                    </Button>
                ) : (
                    <Button 
                    onClick={handleSubmit} 
                    disabled={!files.selfie || loading}
                    className="bg-[var(--color-primary)] text-white"
                    >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                    {t('submitForReview')}
                    </Button>
                )}
                </div>

            </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}

export default function KYCPage() {
  const tc = useTranslations('Common');
  return (
    <Suspense fallback={<div>{tc('loading')}</div>}>
      <KYCContent />
    </Suspense>
  );
}
