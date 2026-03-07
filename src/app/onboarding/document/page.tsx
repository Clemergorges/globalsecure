
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
import { Loader2, CheckCircle, UploadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';

type DocumentFormValues = {
  documentType: 'PASSPORT' | 'NATIONAL_ID' | 'RESIDENCE_PERMIT' | 'DRIVERS_LICENSE';
  documentNumber: string;
  documentExpiry?: string;
};

export default function DocumentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('Onboarding.Document');
  const tc = useTranslations('Common');
  const [loading, setLoading] = useState(false);

  const documentSchema = z.object({
    documentType: z.enum(['PASSPORT', 'NATIONAL_ID', 'RESIDENCE_PERMIT', 'DRIVERS_LICENSE']),
    documentNumber: z.string().min(5, t('validation.invalidNumber')),
    documentExpiry: z.string().optional(),
  });

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
  });

  const { register, handleSubmit, formState: { errors }, setValue } = form;

  const onSubmit = async (data: DocumentFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || t('errors.submitFailed'));

      router.push('/onboarding/status');
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

  return (
    <Card className="bg-[#111116] border-white/10">
      <CardHeader>
        <CardTitle className="text-xl text-white">{t('title')}</CardTitle>
        <CardDescription className="text-slate-400">
          {t('subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-300">{t('documentType')}</Label>
            <Select onValueChange={(val) => setValue('documentType', val as any)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder={t('selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-[#111116] border-white/10 text-white">
                <SelectItem value="PASSPORT">{t('docTypes.passport')}</SelectItem>
                <SelectItem value="NATIONAL_ID">{t('docTypes.nationalId')}</SelectItem>
                <SelectItem value="DRIVERS_LICENSE">{t('docTypes.driversLicense')}</SelectItem>
                <SelectItem value="RESIDENCE_PERMIT">{t('docTypes.residencePermit')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.documentType && <p className="text-xs text-red-400">{errors.documentType.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">{t('documentNumber')}</Label>
            <Input {...register('documentNumber')} className="bg-white/5 border-white/10 text-white" />
            {errors.documentNumber && <p className="text-xs text-red-400">{errors.documentNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">{t('documentExpiry')}</Label>
            <Input type="date" {...register('documentExpiry')} className="bg-white/5 border-white/10 text-white" />
          </div>

          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-cyan-500/50 transition-colors bg-white/[0.02]">
            <UploadCloud className="w-10 h-10 text-slate-500 mb-4" />
            <h3 className="text-white font-medium mb-1">{t('upload.title')}</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              {t('upload.description')}
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-11">
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            {t('submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
