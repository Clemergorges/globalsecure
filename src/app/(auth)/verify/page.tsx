'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha na verificação');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?verified=true');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-6">
          <Logo showText={false} className="w-16 h-16" />
        </div>
        <CardTitle className="text-2xl text-center font-bold text-gray-900">Verificar Email</CardTitle>
        <CardDescription className="text-center text-gray-500">
          Enviamos um código de 6 dígitos para <br />
          <span className="font-medium text-gray-900">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">Email Verificado!</h3>
              <p className="text-gray-500">Redirecionando para o login...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-gray-700">Código de Verificação</Label>
              <Input 
                id="code" 
                name="code" 
                placeholder="000000" 
                required 
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="bg-white border-gray-300 text-center text-2xl tracking-[0.5em] h-14 font-mono focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
              />
              <p className="text-xs text-gray-500 text-center">
                Verifique sua caixa de entrada e spam.
              </p>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <Button className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold h-11 shadow-sm" type="submit" disabled={loading || code.length < 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-center">Carregando...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}