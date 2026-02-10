
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, Smartphone, Key, Globe, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  // Password State
  const [passwordData, setPasswordData] = useState({ current: '', new: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

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
      
      alert('Senha alterada com sucesso!');
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
      alert('Autenticação de Dois Fatores Ativada!');
    } catch (e) {
      alert('Erro ao verificar código');
    } finally {
      setOtpLoading(false);
    }
  }

  async function revokeSession(id: string) {
    if (!confirm('Tem certeza que deseja desconectar este dispositivo?')) return;
    try {
      await fetch('/api/security/sessions', {
        method: 'DELETE',
        body: JSON.stringify({ sessionId: id })
      });
      fetchSessions();
    } catch (e) {
      alert('Erro ao desconectar');
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div>
        <h1 className="text-2xl font-bold">Segurança da Conta</h1>
        <p className="text-gray-500">Gerencie sua senha e métodos de autenticação.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle>Alterar Senha</CardTitle>
            </div>
            <CardDescription>Recomendamos usar uma senha forte e única.</CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordChange}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Senha Atual</Label>
                <Input 
                  type="password" 
                  value={passwordData.current}
                  onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <Input 
                  type="password" 
                  value={passwordData.new}
                  onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                  required minLength={8}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading && <Loader2 className="animate-spin mr-2" />}
                Atualizar Senha
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[var(--color-primary)]" />
              <CardTitle>Autenticação de Dois Fatores</CardTitle>
            </div>
            <CardDescription>Adicione uma camada extra de segurança via SMS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="space-y-0.5">
                <Label className="text-base">SMS 2FA</Label>
                <p className="text-sm text-gray-500">
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--color-primary)]" />
            <CardTitle>Sessões Ativas</CardTitle>
          </div>
          <CardDescription>Gerencie os dispositivos conectados à sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingSessions ? (
              <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" /></div>
            ) : sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 border-b last:border-0">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                     <Shield className="w-5 h-5 text-gray-500" />
                   </div>
                   <div>
                     <p className="font-medium text-sm">{session.userAgent || 'Dispositivo Desconhecido'}</p>
                     <p className="text-xs text-gray-500">
                       {session.ipAddress} • {new Date(session.createdAt).toLocaleDateString()}
                       {session.isCurrent && <span className="ml-2 text-emerald-600 font-bold">(Atual)</span>}
                     </p>
                   </div>
                </div>
                {!session.isCurrent && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => revokeSession(session.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar Código SMS</DialogTitle>
            <DialogDescription>
              Enviamos um código de 6 dígitos para o seu telefone cadastrado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="000000" 
              className="text-center text-2xl tracking-widest" 
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={verifyOtp} disabled={otpLoading || otpCode.length !== 6}>
              {otpLoading && <Loader2 className="animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
