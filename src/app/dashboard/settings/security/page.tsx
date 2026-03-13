
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, Smartphone, Key, Globe, LogOut, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import TravelModeToggle from '@/components/settings/TravelModeToggle';

interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastActive?: string | null;
  deviceType?: string | null;
  location?: string | null;
  isCurrent: boolean;
}

function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const diffMs = d.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const minutes = Math.round(diffMs / (60 * 1000));
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  if (Math.abs(hours) < 48) return rtf.format(hours, 'hour');
  return rtf.format(days, 'day');
}

export default function SecuritySettingsPage() {
  const t = useTranslations('Settings.Security');
  const tc = useTranslations('Common');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Password State
  const [passwordData, setPasswordData] = useState({ current: '', new: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordOtpDialogOpen, setPasswordOtpDialogOpen] = useState(false);
  const [passwordOtpRequesting, setPasswordOtpRequesting] = useState(false);
  const [passwordOtpSubmitting, setPasswordOtpSubmitting] = useState(false);
  const [passwordOtpCode, setPasswordOtpCode] = useState('');
  const [passwordOtpError, setPasswordOtpError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState<number>(0);

  // 2FA State
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [yieldEnabled, setYieldEnabled] = useState(false);
  const [yieldLoading, setYieldLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    fetchYieldSetting();
    fetchMe();
    // Ideally fetch current 2FA status here too
  }, []);

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me');
      const data: unknown = await res.json().catch(() => ({}));
      if (res.ok && data && typeof data === 'object') {
        const maybeUser = (data as { user?: unknown }).user;
        const maybeEmail = maybeUser && typeof maybeUser === 'object' ? (maybeUser as { email?: unknown }).email : undefined;
        const maybeTwoFactorEnabled =
          maybeUser && typeof maybeUser === 'object' ? (maybeUser as { twoFactorEnabled?: unknown }).twoFactorEnabled : undefined;
        if (typeof maybeEmail === 'string' && maybeEmail.length > 0) setUserEmail(maybeEmail);
        setTwoFaEnabled(Boolean(maybeTwoFactorEnabled));
      }
    } catch {
      setUserEmail(null);
      setTwoFaEnabled(false);
    }
  }

  async function fetchSessions() {
    try {
      const res = await fetch('/api/security/sessions');
      const data: unknown = await res.json().catch(() => ({}));
      const list = data && typeof data === 'object' ? (data as { sessions?: unknown }).sessions : undefined;
      setSessions(Array.isArray(list) ? (list as Session[]) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function fetchYieldSetting() {
    try {
      const res = await fetch('/api/user/yield-toggle');
      const data = await res.json();
      if (res.ok) {
        setYieldEnabled(Boolean(data.yieldEnabled));
      }
    } finally {
      setYieldLoading(false);
    }
  }

  async function toggleYield(next: boolean) {
    setYieldLoading(true);
    try {
      const res = await fetch('/api/user/yield-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setYieldEnabled(Boolean(data.yieldEnabled));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(errorMessage);
    } finally {
      setYieldLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    try {
      setPasswordOtpError(null);
      setPasswordOtpRequesting(true);
      setPasswordLoading(true);
      const res = await fetch('/api/auth/sensitive/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'SENSITIVE_CHANGE_PASSWORD' }),
      });
      
      const data: unknown = await res.json().catch(() => ({}));
      const parsedError = data && typeof data === 'object' ? (data as { error?: unknown }).error : undefined;
      if (!res.ok) {
        const message = typeof parsedError === 'string' ? parsedError : t('passwordChange.passwordChangeFailed');
        throw new Error(message);
      }

      setPasswordOtpCode('');
      setResendSeconds(60);
      setPasswordOtpDialogOpen(true);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(errorMessage);
    } finally {
      setPasswordOtpRequesting(false);
      setPasswordLoading(false);
    }
  }

  useEffect(() => {
    if (!passwordOtpDialogOpen) return;
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [passwordOtpDialogOpen, resendSeconds]);

  async function resendPasswordOtp() {
    if (resendSeconds > 0) return;
    setPasswordOtpError(null);
    setPasswordOtpRequesting(true);
    try {
      const res = await fetch('/api/auth/sensitive/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'SENSITIVE_CHANGE_PASSWORD' }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const parsedError = data && typeof data === 'object' ? (data as { error?: unknown }).error : undefined;
      if (!res.ok) {
        const message = typeof parsedError === 'string' ? parsedError : t('passwordChange.passwordChangeFailed');
        throw new Error(message);
      }
      setResendSeconds(60);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('passwordChange.passwordChangeFailed');
      setPasswordOtpError(message);
    } finally {
      setPasswordOtpRequesting(false);
    }
  }

  async function submitPasswordOtp() {
    if (passwordOtpCode.length !== 6) return;
    setPasswordOtpSubmitting(true);
    setPasswordOtpError(null);
    try {
      const res = await fetch('/api/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new,
          otpCode: passwordOtpCode,
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const parsedCode = data && typeof data === 'object' ? (data as { code?: unknown }).code : undefined;
      const parsedError = data && typeof data === 'object' ? (data as { error?: unknown }).error : undefined;
      if (!res.ok) {
        const code = typeof parsedCode === 'string' ? parsedCode : null;
        if (code === 'OTP_INVALID') throw new Error(t('passwordChange.otpInvalid'));
        if (code === 'OTP_EXPIRED') throw new Error(t('passwordChange.otpExpired'));
        if (code === 'OTP_USED') throw new Error(t('passwordChange.otpUsed'));
        const message = typeof parsedError === 'string' ? parsedError : t('passwordChange.passwordChangeFailed');
        throw new Error(message);
      }

      setPasswordOtpDialogOpen(false);
      setPasswordData({ current: '', new: '' });
      alert(t('passwordChange.passwordChanged'));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('passwordChange.passwordChangeFailed');
      setPasswordOtpError(message);
    } finally {
      setPasswordOtpSubmitting(false);
    }
  }

  async function toggle2FA(enabled: boolean) {
    if (enabled) {
      // Start enablement flow
      try {
        const res = await fetch('/api/security/2fa/enable', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
          const msg =
            typeof data?.error === 'string' && data.error.toLowerCase().includes('phone')
              ? t('phoneRequiredFor2FA')
              : typeof data?.error === 'string'
                ? data.error
                : t('connectionError');
          throw new Error(msg);
        }
        setShowOtpDialog(true);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        alert(errorMessage);
      }
    } else {
      try {
        const res = await fetch('/api/security/2fa/disable', { method: 'POST' });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data && typeof data === 'object' ? (data as { error?: unknown }).error : undefined;
          throw new Error(typeof msg === 'string' ? msg : t('connectionError'));
        }
        setTwoFaEnabled(false);
      } catch (e: unknown) {
        setTwoFaEnabled(true);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        alert(errorMessage);
      }
    }
  }

  async function verifyOtp() {
    setOtpLoading(true);
    try {
      const res = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode })
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(t('errorVerifyingCode'));
      
      const enabled2fa = data && typeof data === 'object' ? (data as { twoFactorEnabled?: unknown }).twoFactorEnabled : undefined;
      setTwoFaEnabled(Boolean(enabled2fa));
      setShowOtpDialog(false);
      setOtpCode('');
      fetchMe();
      alert(t('twoFactorEnabled'));
    } catch (e) {
      alert(t('errorVerifyingCode'));
    } finally {
      setOtpLoading(false);
    }
  }

  async function revokeSession(id: string) {
    if (!confirm(t('sessions.revokeConfirm'))) return;
    try {
      await fetch('/api/security/sessions', {
        method: 'DELETE',
        body: JSON.stringify({ sessionId: id })
      });
      fetchSessions();
    } catch (e) {
      alert(t('errorDisconnecting'));
    }
  }

  async function revokeAllOtherSessions() {
    const other = sessions.filter((s) => !s.isCurrent).map((s) => s.id);
    if (other.length === 0) return;
    if (!confirm(t('sessions.revokeAllConfirm'))) return;
    for (const id of other) {
      try {
        await fetch('/api/security/sessions', { method: 'DELETE', body: JSON.stringify({ sessionId: id }) });
      } catch {}
    }
    fetchSessions();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('accountSecurity')}</h1>
        <p className="text-slate-400">{t('managePasswordAuth')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change Password */}
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle className="text-white">{t('changePassword')}</CardTitle>
            </div>
            <CardDescription className="text-slate-400">{t('strongPasswordRecommended')}</CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordChange}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">{t('currentPassword')}</Label>
                <div className="relative">
                  <Input 
                    type={showCurrentPassword ? "text" : "password"} 
                    autoComplete="current-password"
                    value={passwordData.current}
                    onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                    required
                    className="pr-10 bg-[#1a1a1f] border-white/10 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t('newPassword')}</Label>
                <div className="relative">
                  <Input 
                    type={showNewPassword ? "text" : "password"} 
                    autoComplete="new-password"
                    value={passwordData.new}
                    onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                    required minLength={8}
                    className="pr-10 bg-[#1a1a1f] border-white/10 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={passwordLoading || passwordOtpDialogOpen || passwordOtpRequesting}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] border-none"
              >
                {(passwordLoading || passwordOtpRequesting) && <Loader2 className="animate-spin mr-2" />}
                {t('updatePassword')}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 2FA */}
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle className="text-white">{t('twoFactorAuth')}</CardTitle>
            </div>
            <CardDescription className="text-slate-400">{t('twoFactorAuthDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-[#1a1a1f] border-white/10">
              <div className="space-y-0.5">
                <Label className="text-base text-slate-300">{t('sms2faLabel')}</Label>
                <p className="text-sm text-slate-400">
                  {twoFaEnabled ? t('statusEnabled') : t('statusDisabled')}
                </p>
              </div>
              <Switch 
                checked={twoFaEnabled}
                onCheckedChange={toggle2FA}
              />
            </div>
          </CardContent>
        </Card>

        {process.env.NEXT_PUBLIC_YIELD_UI_ENABLED === 'true' ? (
          <Card className="bg-[#111116] border-white/5 backdrop-blur-sm md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                <CardTitle className="text-white">{t('yieldToggleTitle')}</CardTitle>
              </div>
              <CardDescription className="text-slate-400">{t('yieldToggleSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-[#1a1a1f] border-white/10">
                <div className="space-y-1">
                  <Label className="text-base text-slate-300">{t('yieldToggleLabel')}</Label>
                  <p className="text-sm text-slate-400">{t('yieldToggleDescription')}</p>
                </div>
                <Switch checked={yieldEnabled} onCheckedChange={toggleYield} disabled={yieldLoading} />
              </div>
            </CardContent>
          </Card>
        ) : null}

        <TravelModeToggle />
      </div>

      {/* Active Sessions */}
      <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--color-primary)]" />
            <CardTitle className="text-white">{t('sessions.title')}</CardTitle>
          </div>
          <CardDescription className="text-slate-400">{t('sessions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingSessions ? (
              <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={revokeAllOtherSessions}
                    disabled={sessions.filter((s) => !s.isCurrent).length === 0}
                    className="border-white/10 text-slate-200 hover:bg-white/[0.06]"
                  >
                    {t('sessions.revokeAll')}
                  </Button>
                </div>
                {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 border-b border-white/10 last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-[#1a1a1f] rounded-full flex items-center justify-center">
                     <Shield className="w-5 h-5 text-slate-400" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-200">{session.userAgent || t('unknownDevice')}</p>
                      {session.isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {t('sessions.current')}
                        </span>
                      )}
                     </div>
                     <div className="text-xs text-slate-500 space-y-1">
                      <div>
                        {session.ipAddress || ''}{session.ipAddress ? ' • ' : ''}{new Date(session.createdAt).toLocaleDateString()}
                      </div>
                      <div className="space-x-3">
                        <span>{t('sessions.device', { device: session.deviceType || t('unknownDevice') })}</span>
                        <span>{t('sessions.location', { location: session.location || '—' })}</span>
                        <span>{t('sessions.lastActive', { time: formatRelativeTime(session.lastActive || session.createdAt) })}</span>
                      </div>
                     </div>
                   </div>
                </div>
                {!session.isCurrent && (
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20" onClick={() => revokeSession(session.id)}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('sessions.revoke')}
                  </Button>
                )}
              </div>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="bg-[#111116] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{t('verifySmsCodeTitle')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('verifySmsCodeDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="000000" 
              className="text-center text-2xl tracking-widest bg-[#1a1a1f] border-white/10 text-white" 
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replaceAll(/\D/g, '').slice(0, 6))}
            />
          </div>
          <DialogFooter>
            <Button onClick={verifyOtp} disabled={otpLoading || otpCode.length !== 6} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
              {otpLoading && <Loader2 className="animate-spin mr-2" />}
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordOtpDialogOpen}
        onOpenChange={(open) => {
          setPasswordOtpDialogOpen(open);
          if (!open) {
            setPasswordOtpCode('');
            setPasswordOtpError(null);
            setResendSeconds(0);
          }
        }}
      >
        <DialogContent className="bg-[#111116] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">{t('changePassword')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('passwordChange.enterOtp')}
            </DialogDescription>
          </DialogHeader>

          {userEmail && (
            <div className="text-xs text-slate-400">
              {t('passwordChange.requestingOtp', { email: userEmail })}
            </div>
          )}

          <div className="py-4 space-y-3">
            <Input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="text-center text-2xl tracking-widest bg-[#1a1a1f] border-white/10 text-white"
              maxLength={6}
              value={passwordOtpCode}
              onChange={(e) => setPasswordOtpCode(e.target.value.replaceAll(/\D/g, '').slice(0, 6))}
            />

            {passwordOtpError && (
              <div className="text-sm text-red-300">{passwordOtpError}</div>
            )}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={resendPasswordOtp}
                disabled={passwordOtpRequesting || resendSeconds > 0}
                className="text-slate-300 hover:text-white"
              >
                {resendSeconds > 0 ? t('passwordChange.otpResend', { seconds: resendSeconds }) : t('passwordChange.otpResendReady')}
              </Button>

              <Button
                type="button"
                onClick={submitPasswordOtp}
                disabled={passwordOtpSubmitting || passwordOtpCode.length !== 6}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                {passwordOtpSubmitting && <Loader2 className="animate-spin mr-2" />}
                {tc('confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
