
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

type AddressFormValues = {
  streetLine1: string;
  streetLine2?: string;
  city: string;
  postalCode: string;
  region?: string;
  country: string;
};

export default function AddressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('Onboarding.Address');
  const tc = useTranslations('Common');
  const [loading, setLoading] = useState(false);

  const addressSchema = z.object({
    streetLine1: z.string().min(5, t('validation.invalidAddress')),
    streetLine2: z.string().optional(),
    city: z.string().min(2, t('validation.cityRequired')),
    postalCode: z.string().min(4, t('validation.postalRequired')),
    region: z.string().optional(),
    country: z.string().length(2, t('validation.selectCountry')),
  });

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: 'BR'
    }
  });

  const { register, handleSubmit, formState: { errors }, setValue } = form;

  const onSubmit = async (data: AddressFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error(t('errors.saveFailed'));

      router.push('/onboarding/document');
    } catch (error) {
      toast({
        title: tc('error'),
        description: t('errors.checkAddress'),
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
          <div className="space-y-2">
            <Label className="text-slate-300">{t('streetLine1')}</Label>
            <Input {...register('streetLine1')} className="bg-white/5 border-white/10 text-white" />
            {errors.streetLine1 && <p className="text-xs text-red-400">{errors.streetLine1.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">{t('streetLine2')}</Label>
            <Input {...register('streetLine2')} placeholder={t('streetLine2Placeholder')} className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">{t('city')}</Label>
              <Input {...register('city')} className="bg-white/5 border-white/10 text-white" />
              {errors.city && <p className="text-xs text-red-400">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">{t('postalCode')}</Label>
              <Input {...register('postalCode')} className="bg-white/5 border-white/10 text-white" />
              {errors.postalCode && <p className="text-xs text-red-400">{errors.postalCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">{t('region')}</Label>
              <Input {...register('region')} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">{t('country')}</Label>
              <Select onValueChange={(val) => setValue('country', val)} defaultValue="BR">
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
              {errors.country && <p className="text-xs text-red-400">{errors.country.message}</p>}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black mt-6">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span className="flex items-center">{tc('next')} <ArrowRight className="w-4 h-4 ml-2" /></span>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
