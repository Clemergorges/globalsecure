
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
import { useTranslations } from 'next-intl';

type RegisterFormValues = {
  email: string;
  password: string;
  country: string;
  gdprConsent: boolean;
  marketingConsent?: boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('Register');
  const tc = useTranslations('Common');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const registerSchema = z.object({
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string()
      .min(8, t('validation.passwordMin'))
      .regex(/[A-Z]/, t('validation.passwordUpper'))
      .regex(/[0-9]/, t('validation.passwordNumber')),
    country: z.string().length(2, t('validation.selectCountry')),
    gdprConsent: z.boolean().refine(val => val === true, {
      message: t('validation.consentRequired')
    }),
    marketingConsent: z.boolean().optional(),
  });

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
        throw new Error(result.error || t('errors.registerFailed'));
      }

      setSuccess(true);
      toast({
        title: t('toast.successTitle'),
        description: t('toast.successDescription'),
      });

      router.push(`/verify?email=${encodeURIComponent(data.email)}`);

    } catch (error: any) {
      toast({
        title: tc('error'),
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
                    <CardTitle className="text-2xl font-bold text-white">{t('verify.title')}</CardTitle>
                    <CardDescription className="text-slate-400">
                        {t.rich('verify.description', {
                          email: form.getValues('email'),
                          strong: (chunks) => <strong>{chunks}</strong>,
                          br: () => <br />,
                        })}
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={() => router.push(`/verify?email=${encodeURIComponent(form.getValues('email'))}`)} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black">
                        {t('verify.continue')}
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
          <CardTitle className="text-2xl font-bold text-white">{t('title')}</CardTitle>
          <CardDescription className="text-slate-400">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input 
                  {...register('email')} 
                  type="email"
                  autoComplete="username"
                  placeholder={t('emailPlaceholder')}
                  disabled={loading}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" 
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input 
                  type="password"
                  autoComplete="new-password"
                  {...register('password')} 
                  placeholder="••••••••" 
                  disabled={loading}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20" 
                />
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">{t('country')}</Label>
              <Select 
                onValueChange={(val) => setValue('country', val)} 
                defaultValue={watchedCountry}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={t('selectCountryPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="BR">{t('countries.br')}</SelectItem>
                  <SelectItem value="US">{t('countries.us')}</SelectItem>
                  <SelectItem value="LU">{t('countries.lu')}</SelectItem>
                  <SelectItem value="DE">{t('countries.de')}</SelectItem>
                  <SelectItem value="PT">{t('countries.pt')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-red-400">{errors.country.message}</p>}
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="gdpr" 
                  onCheckedChange={(c) => setValue('gdprConsent', c === true)}
                  disabled={loading}
                  className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-black"
                />
                <label htmlFor="gdpr" className="text-xs text-slate-400 leading-tight">
                  {t('gdprConsent')}
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
              {t('submit')}
            </Button>
            
            <p className="text-center text-xs text-slate-500 mt-4">
                {t.rich('loginLink', { link: (chunks) => <a href="/auth/login" className="text-cyan-400 hover:underline">{chunks}</a> })}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
