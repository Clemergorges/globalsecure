
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "Pelo menos um número"),
  country: z.string().length(2, "Selecione um país"),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: "Consentimento obrigatório"
  }),
  marketingConsent: z.boolean().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country: 'BR',
      gdprConsent: undefined,
      marketingConsent: false,
    }
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
  const watchedCountry = watch('country');

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Falha no registro');
      }

      setSuccess(true);
      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para ativar sua conta.",
      });

      // Optional: Auto redirect to login or show success screen
      setTimeout(() => router.push('/auth/login?registered=true'), 3000);

    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-black/95">
            <Card className="w-full max-w-md bg-[#111116] border-white/10">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Verifique seu Email</CardTitle>
                    <CardDescription className="text-slate-400">
                        Enviamos um código de verificação para <strong>{form.getValues('email')}</strong>.
                        <br/><br/>
                        Clique no link ou use o código para ativar sua conta e prosseguir para a abertura da conta financeira.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={() => router.push('/auth/login')} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black">
                        Ir para Login
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black/95">
      <Card className="w-full max-w-md bg-[#111116] border-white/10 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Criar Conta</CardTitle>
          <CardDescription className="text-slate-400">
            Comece sua jornada financeira global
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input 
                  {...register('email')} 
                  placeholder="nome@exemplo.com" 
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" 
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input 
                  type="password"
                  {...register('password')} 
                  placeholder="••••••••" 
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" 
                />
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">País de Residência</Label>
              <Select 
                onValueChange={(val) => setValue('country', val)} 
                defaultValue={watchedCountry}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                  <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                  <SelectItem value="LU">🇱🇺 Luxemburgo</SelectItem>
                  <SelectItem value="DE">🇩🇪 Alemanha</SelectItem>
                  <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-red-400">{errors.country.message}</p>}
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="gdpr" 
                  onCheckedChange={(c) => setValue('gdprConsent', c === true)}
                  className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-black"
                />
                <label htmlFor="gdpr" className="text-xs text-slate-400 leading-tight">
                  Concordo com os Termos de Uso e Política de Privacidade. Entendo que meus dados serão processados conforme a GDPR/LGPD.
                </label>
              </div>
              {errors.gdprConsent && <p className="text-xs text-red-400">{errors.gdprConsent.message}</p>}
            </div>

            <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-11"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Criar Conta Grátis
            </Button>
            
            <p className="text-center text-xs text-slate-500 mt-4">
                Já tem uma conta? <a href="/auth/login" className="text-cyan-400 hover:underline">Fazer Login</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
