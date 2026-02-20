
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

type PersonalFormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  countryOfBirth: string;
  nationality: string;
  phone: string;
};

export default function PersonalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('Onboarding.Personal');
  const tc = useTranslations('Common');
  const [loading, setLoading] = useState(false);

  const personalSchema = z.object({
    firstName: z.string().min(2, t('validation.firstNameRequired')),
    lastName: z.string().min(2, t('validation.lastNameRequired')),
    dateOfBirth: z.string().refine((val) => {
      const date = new Date(val);
      const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18;
    }, { message: t('validation.minimumAge') }),
    countryOfBirth: z.string().length(2, t('validation.selectCountry')),
    nationality: z.string().length(2, t('validation.selectNationality')),
    phone: z.string().min(8, t('validation.invalidPhone')),
  });

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalSchema),
  });

  const { register, handleSubmit, formState: { errors }, setValue } = form;

  const onSubmit = async (data: PersonalFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/personal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error(t('errors.saveFailed'));

      router.push('/onboarding/address');
    } catch (error) {
      toast({
        title: tc('error'),
        description: t('errors.checkData'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#111116] border-white/10">
      <CardHeader>
        <CardTitle className="text-xl text-white">{t('title')}</CardTitle>
        <CardDescription className="text-slate-400">
          {t('subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">{t('firstName')}</Label>
              <Input {...register('firstName')} className="bg-white/5 border-white/10 text-white" />
              {errors.firstName && <p className="text-xs text-red-400">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">{t('lastName')}</Label>
              <Input {...register('lastName')} className="bg-white/5 border-white/10 text-white" />
              {errors.lastName && <p className="text-xs text-red-400">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">{t('dateOfBirth')}</Label>
            <Input type="date" {...register('dateOfBirth')} className="bg-white/5 border-white/10 text-white" />
            {errors.dateOfBirth && <p className="text-xs text-red-400">{errors.dateOfBirth.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">{t('countryOfBirth')}</Label>
              <Select onValueChange={(val) => setValue('countryOfBirth', val)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={t('selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="BR">{t('countries.br')}</SelectItem>
                  <SelectItem value="US">{t('countries.us')}</SelectItem>
                  <SelectItem value="LU">{t('countries.lu')}</SelectItem>
                  <SelectItem value="PT">{t('countries.pt')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.countryOfBirth && <p className="text-xs text-red-400">{errors.countryOfBirth.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">{t('nationality')}</Label>
              <Select onValueChange={(val) => setValue('nationality', val)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={t('selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-[#111116] border-white/10 text-white">
                  <SelectItem value="BR">{t('nationalities.br')}</SelectItem>
                  <SelectItem value="US">{t('nationalities.us')}</SelectItem>
                  <SelectItem value="LU">{t('nationalities.lu')}</SelectItem>
                  <SelectItem value="PT">{t('nationalities.pt')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.nationality && <p className="text-xs text-red-400">{errors.nationality.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">{t('phone')}</Label>
            <Input {...register('phone')} placeholder={t('phonePlaceholder')} className="bg-white/5 border-white/10 text-white" />
            {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black mt-6">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span className="flex items-center">{tc('next')} <ArrowRight className="w-4 h-4 ml-2" /></span>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
