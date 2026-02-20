
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function StatusPage() {
  const router = useRouter();
  const t = useTranslations('Onboarding.Status');

  return (
    <Card className="bg-[#111116] border-white/10 text-center py-8">
      <CardHeader>
        <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <CardTitle className="text-2xl text-white mb-2">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-slate-400 max-w-md mx-auto">
          {t.rich('description', { br: () => <br /> })}
        </p>

        <div className="bg-white/5 rounded-lg p-4 text-left max-w-sm mx-auto space-y-3">
            <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-300">{t('checks.personal')}</span>
            </div>
            <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-300">{t('checks.address')}</span>
            </div>
            <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-white font-medium">{t('checks.document')}</span>
            </div>
        </div>

        <Button 
            onClick={() => router.push('/dashboard')} 
            className="w-full max-w-xs bg-white/10 hover:bg-white/20 text-white"
        >
          {t('cta')}
        </Button>
      </CardContent>
    </Card>
  );
}
