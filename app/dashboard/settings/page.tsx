'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Lock, Globe, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsGeneralPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>

      <div className="grid gap-6">
        
        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              Segurança
            </CardTitle>
            <CardDescription>Gerencie sua senha e autenticação.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Senha e Autenticação</p>
              <p className="text-sm text-gray-500">Alterar senha ou ativar autenticação em dois fatores.</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings/security')}>
              Gerenciar Segurança
            </Button>
          </CardContent>
        </Card>

        {/* Notificações (Simulado) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-500" />
              Notificações
            </CardTitle>
            <CardDescription>Escolha como você quer ser avisado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-notif">Notificações por Email</Label>
                <p className="text-sm text-gray-500">Receber comprovantes e alertas de segurança.</p>
              </div>
              <Switch id="email-notif" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="push-notif">Notificações Push</Label>
                <p className="text-sm text-gray-500">Alertas em tempo real no navegador.</p>
              </div>
              <Switch id="push-notif" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-500" />
              Preferências
            </CardTitle>
            <CardDescription>Ajuste sua experiência.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Moeda Principal</Label>
                <p className="text-sm text-gray-500">Moeda usada para exibir seu saldo total.</p>
              </div>
              <Button variant="outline" size="sm">Euro (EUR)</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Idioma</Label>
                <p className="text-sm text-gray-500">Idioma da interface.</p>
              </div>
              <Button variant="outline" size="sm">Português (BR)</Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}