'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Loader2, Check, X, ChevronRight, ChevronLeft, 
  Eye, EyeOff, ShieldCheck, Mail, Lock, User, 
  Phone, MapPin, FileText, Calendar 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { validateCPF, isAdult } from '@/lib/validation';

// --- Schemas & Validation ---

const step1Schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Pelo menos um caractere especial"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const step2Schema = z.object({
  fullName: z.string().min(3, "Nome completo obrigatório"),
  phone: z.string().min(10, "Telefone inválido"),
  birthDate: z.string().refine((val) => isAdult(val), {
    message: "Você deve ter pelo menos 18 anos",
  }),
  gender: z.enum(['M', 'F', 'O', 'NB'], {
    errorMap: () => ({ message: "Selecione um gênero" }),
  }),
});

const step3Schema = z.object({
  country: z.string().length(2, "Selecione um país"),
  documentId: z.string().min(5, "Documento inválido"),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Consentimento obrigatório" }),
  }),
  cookieConsent: z.literal(true, {
    errorMap: () => ({ message: "Consentimento obrigatório" }),
  }),
  marketingConsent: z.boolean().optional(),
});

// Combined schema for final submission type inference
const registerSchema = z.intersection(
  z.intersection(step1Schema, step2Schema),
  step3Schema
);

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // React Hook Form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      country: 'BR',
      gdprConsent: undefined,
      cookieConsent: undefined,
      marketingConsent: false,
    }
  });

  const { register, handleSubmit, formState: { errors, isValid }, trigger, watch, setValue } = form;
  
  const watchedCountry = watch('country');
  const watchedPassword = watch('password') || '';

  // --- Step Navigation ---

  const nextStep = async () => {
    let valid = false;
    if (step === 1) valid = await trigger(['email', 'password', 'confirmPassword']);
    if (step === 2) valid = await trigger(['fullName', 'phone', 'birthDate', 'gender']);
    
    if (valid) setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  // --- Submission ---

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      // Validar CPF se Brasil
      if (data.country === 'BR' && !validateCPF(data.documentId)) {
        form.setError('documentId', { message: 'CPF inválido' });
        throw new Error('CPF inválido');
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Falha no registro');
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para ativar sua conta.",
      });

      router.push('/auth/login?registered=true');

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

  // --- UI Components ---

  const PasswordStrength = ({ password }: { password: string }) => {
    const strength = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ].filter(Boolean).length;

    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
    const labels = ['Muito Fraca', 'Fraca', 'Média', 'Forte', 'Muito Forte'];

    return (
      <div className="space-y-1 mt-2">
        <div className="flex gap-1 h-1">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={`h-full flex-1 rounded-full transition-all ${i < strength ? colors[Math.min(strength - 1, 4)] : 'bg-slate-700'}`} 
            />
          ))}
        </div>
        <p className={`text-xs text-right ${strength > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
          {password ? labels[Math.min(strength - 1, 4)] : 'Força da senha'}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Criar sua conta</CardTitle>
          <CardDescription className="text-muted-foreground">
            Passo {step} de 3: {step === 1 ? 'Credenciais' : step === 2 ? 'Dados Pessoais' : 'Finalização'}
          </CardDescription>
          
          {/* Progress Bar */}
          <div className="w-full bg-secondary h-1 mt-4 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-600 dark:bg-cyan-400" 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AnimatePresence mode="wait">
              
              {/* --- STEP 1: CREDENTIALS --- */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Corporativo ou Pessoal</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        {...register('email')} 
                        placeholder="nome@exemplo.com" 
                        className="pl-9" 
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha Segura</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        {...register('password')} 
                        placeholder="••••••••" 
                        className="pl-9 pr-9" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={watchedPassword} />
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="password" 
                        {...register('confirmPassword')} 
                        placeholder="••••••••" 
                        className="pl-9" 
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                  </div>
                </motion.div>
              )}

              {/* --- STEP 2: PERSONAL INFO --- */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Nome Completo (como no documento)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        {...register('fullName')} 
                        placeholder="Ex: João Silva" 
                        className="pl-9" 
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="date"
                          {...register('birthDate')} 
                          className="pl-9" 
                        />
                      </div>
                      {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Gênero</Label>
                      <Select onValueChange={(val) => setValue('gender', val as any)}>
                        <SelectTrigger className="bg-background border-input">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                          <SelectItem value="NB">Não-binário</SelectItem>
                          <SelectItem value="O">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone Celular</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        {...register('phone')} 
                        placeholder="+55 11 99999-9999" 
                        className="pl-9" 
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                  </div>
                </motion.div>
              )}

              {/* --- STEP 3: LEGAL & DOCS --- */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>País de Residência</Label>
                    <Select 
                      onValueChange={(val) => setValue('country', val)} 
                      defaultValue={watchedCountry}
                    >
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BR">Brasil</SelectItem>
                        <SelectItem value="US">Estados Unidos</SelectItem>
                        <SelectItem value="LU">Luxemburgo</SelectItem>
                        <SelectItem value="DE">Alemanha</SelectItem>
                        <SelectItem value="PT">Portugal</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {watchedCountry === 'BR' ? 'CPF' : 'Número do Documento (ID/Passport)'}
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        {...register('documentId')} 
                        placeholder={watchedCountry === 'BR' ? '000.000.000-00' : 'Document ID'} 
                        className="pl-9" 
                      />
                    </div>
                    {errors.documentId && <p className="text-xs text-destructive">{errors.documentId.message}</p>}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="gdpr" 
                        onCheckedChange={(c) => setValue('gdprConsent', c === true)}
                      />
                      <label htmlFor="gdpr" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Concordo com o processamento de dados pessoais (GDPR/LGPD).
                      </label>
                    </div>
                    {errors.gdprConsent && <p className="text-xs text-destructive">{errors.gdprConsent.message}</p>}

                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="cookie" 
                        onCheckedChange={(c) => setValue('cookieConsent', c === true)}
                      />
                      <label htmlFor="cookie" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Aceito a política de cookies e termos de uso.
                      </label>
                    </div>
                    {errors.cookieConsent && <p className="text-xs text-destructive">{errors.cookieConsent.message}</p>}

                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="marketing" 
                        onCheckedChange={(c) => setValue('marketingConsent', c === true)}
                      />
                      <label htmlFor="marketing" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        (Opcional) Quero receber novidades e ofertas.
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border pt-6">
          {step > 1 ? (
            <Button variant="ghost" onClick={prevStep} disabled={loading}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => router.push('/auth/login')}>
              Já tenho conta
            </Button>
          )}

          {step < 3 ? (
            <Button onClick={nextStep} className="bg-cyan-700 hover:bg-cyan-800 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-black">
              Próximo <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit(onSubmit)} 
              disabled={loading}
              className="bg-green-700 hover:bg-green-800 text-white dark:bg-green-500 dark:hover:bg-green-400 dark:text-black font-bold shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Finalizar Cadastro
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}