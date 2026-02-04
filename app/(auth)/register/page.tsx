'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { z } from 'zod';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <Card className="w-full max-w-md border-white/10 bg-slate-900/50 backdrop-blur-xl text-slate-100 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-2">
               <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">GlobalSecure<span className="text-indigo-400">Send</span></span>
          </div>
          <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
          <CardDescription className="text-center text-slate-400">
            Comece a enviar dinheiro globalmente hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input 
                  id="fullName" 
                  name="fullName" 
                  placeholder="João Silva" 
                  required 
                  value={formData.fullName}
                  onChange={handleChange}
                  className="bg-slate-950/50 border-white/10 focus:border-indigo-500" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input 
                  id="country" 
                  name="country" 
                  placeholder="BR" 
                  maxLength={2} 
                  required 
                  value={formData.country}
                  onChange={handleChange}
                  className="bg-slate-950/50 border-white/10 focus:border-indigo-500 uppercase" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="seu@email.com" 
                required 
                value={formData.email}
                onChange={handleChange}
                className="bg-slate-950/50 border-white/10 focus:border-indigo-500" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                value={formData.password}
                onChange={handleChange}
                className="bg-slate-950/50 border-white/10 focus:border-indigo-500" 
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
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-right text-slate-400">
                    {passwordStrength < 2 ? 'Fraca' : passwordStrength < 4 ? 'Média' : 'Forte'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mainCurrency">Moeda Principal</Label>
              <select 
                id="mainCurrency" 
                name="mainCurrency" 
                value={formData.mainCurrency}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dólar Americano)</option>
                <option value="BRL">BRL (Real Brasileiro)</option>
              </select>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold h-11 shadow-[0_0_20px_rgba(99,102,241,0.3)]" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Conta
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-slate-400">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
