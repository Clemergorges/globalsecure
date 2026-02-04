'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { Logo } from '@/components/ui/logo';

// Schema de validação
const registerSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  country: z.string().length(2, "Use o código de 2 letras (ex: BR, PT, US)"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter um número")
    .regex(/[^A-Za-z0-9]/, "Deve conter um caractere especial"),
  mainCurrency: z.enum(['EUR', 'USD', 'BRL'])
});

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    country: '',
    email: '',
    password: '',
    mainCurrency: 'EUR'
  });

  // Password Strength Calculation
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  useEffect(() => {
    let score = 0;
    if (formData.password.length >= 8) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/[0-9]/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;
    setPasswordStrength(score);
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate Frontend
      registerSchema.parse(formData);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Falha no registro');
      }
      
      router.push('/login?registered=true');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        // @ts-ignore
        setError(err.errors[0].message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-gray-200 bg-white shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-6">
            <Logo showText={false} className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl text-center font-bold text-gray-900">Criar Conta</CardTitle>
          <CardDescription className="text-center text-gray-500">
            Comece a enviar dinheiro globalmente hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700">Nome Completo</Label>
                <Input 
                  id="fullName" 
                  name="fullName" 
                  placeholder="João Silva" 
                  required 
                  value={formData.fullName}
                  onChange={handleChange}
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-gray-700">País</Label>
                <Input 
                  id="country" 
                  name="country" 
                  placeholder="BR" 
                  maxLength={2} 
                  required 
                  value={formData.country}
                  onChange={handleChange}
                  className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] uppercase" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="seu@email.com" 
                required 
                value={formData.email}
                onChange={handleChange}
                className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Senha</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                value={formData.password}
                onChange={handleChange}
                className="bg-white border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]" 
              />
              {/* Password Strength Meter */}
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1 mt-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength >= level 
                            ? (passwordStrength <= 2 ? 'bg-red-500' : passwordStrength === 3 ? 'bg-yellow-500' : 'bg-emerald-500') 
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-right text-gray-500">
                    {passwordStrength < 2 ? 'Fraca' : passwordStrength < 4 ? 'Média' : 'Forte'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainCurrency" className="text-gray-700">Moeda Principal</Label>
              <select 
                id="mainCurrency" 
                name="mainCurrency" 
                value={formData.mainCurrency}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                required
              >
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dólar Americano)</option>
                <option value="BRL">BRL (Real Brasileiro)</option>
              </select>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <Button className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold h-11 shadow-sm" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-[var(--color-primary)] hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
