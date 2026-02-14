
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

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const t = useTranslations('Settings.Security');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  // Password State
  const [passwordData, setPasswordData] = useState({ current: '', new: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA State
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
    // Ideally fetch current 2FA status here too
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch('/api/security/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      const res = await fetch('/api/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: passwordData.current, 
          newPassword: passwordData.new 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(t('passwordChangedSuccessfully'));
      setPasswordData({ current: '', new: '' });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function toggle2FA(enabled: boolean) {
    if (enabled) {
      // Start enablement flow
      try {
        const res = await fetch('/api/security/2fa/enable', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setShowOtpDialog(true);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        alert(errorMessage);
      }
    } else {
      // Disable logic (simplified for MVP)
      setTwoFaEnabled(false);
    }
  }

  async function verifyOtp() {
    setOtpLoading(true);
    try {
      const res = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: otpCode })
      });
      if (!res.ok) throw new Error('Código inválido');
      
      setTwoFaEnabled(true);
      setShowOtpDialog(false);
      alert(t('twoFactorEnabled'));
    } catch (e) {
      alert(t('errorVerifyingCode'));
    } finally {
      setOtpLoading(false);
    }
  }

  async function revokeSession(id: string) {
    if (!confirm(t('confirmDisconnectDevice'))) return;
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
              <Button type="submit" disabled={passwordLoading} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] border-none">
                {passwordLoading && <Loader2 className="animate-spin mr-2" />}
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
              <CardTitle className="text-white">Autenticação de Dois Fatores</CardTitle>
            </div>
            <CardDescription className="text-slate-400">Adicione uma camada extra de segurança via SMS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-[#1a1a1f] border-white/10">
              <div className="space-y-0.5">
                <Label className="text-base text-slate-300">SMS 2FA</Label>
                <p className="text-sm text-slate-400">
                  {twoFaEnabled ? 'Ativado' : 'Desativado'}
                </p>
              </div>
              <Switch 
                checked={twoFaEnabled}
                onCheckedChange={toggle2FA}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--color-primary)]" />
            <CardTitle className="text-white">Sessões Ativas</CardTitle>
          </div>
          <CardDescription className="text-slate-400">Gerencie os dispositivos conectados à sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingSessions ? (
              <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
            ) : sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 border-b border-white/10 last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-[#1a1a1f] rounded-full flex items-center justify-center">
                     <Shield className="w-5 h-5 text-slate-400" />
                   </div>
                   <div>
                     <p className="font-medium text-sm text-slate-200">{session.userAgent || 'Dispositivo Desconhecido'}</p>
                     <p className="text-xs text-slate-500">
                       {session.ipAddress} • {new Date(session.createdAt).toLocaleDateString()}
                       {session.isCurrent && <span className="ml-2 text-green-400 font-bold">(Atual)</span>}
                     </p>
                   </div>
                </div>
                {!session.isCurrent && (
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20" onClick={() => revokeSession(session.id)}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="bg-[#111116] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Verificar Código SMS</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enviamos um código de 6 dígitos para o seu telefone cadastrado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="000000" 
              className="text-center text-2xl tracking-widest bg-[#1a1a1f] border-white/10 text-white" 
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={verifyOtp} disabled={otpLoading || otpCode.length !== 6} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
              {otpLoading && <Loader2 className="animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
