'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SupportPage() {
  const t = useTranslations('Support');
  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight text-white">{t('title')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* FAQs */}
        <Card className="md:col-span-2 bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">{t('faq.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-slate-200 hover:text-white">{t('faq.q1.title')}</AccordionTrigger>
                <AccordionContent className="text-slate-300">
                  {t('faq.q1.answer')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-slate-200 hover:text-white">{t('faq.q2.title')}</AccordionTrigger>
                <AccordionContent className="text-slate-300">
                  {t('faq.q2.answer')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-slate-200 hover:text-white">{t('faq.q3.title')}</AccordionTrigger>
                <AccordionContent className="text-slate-300">
                  {t('faq.q3.answer')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-slate-200 hover:text-white">{t('faq.q4.title')}</AccordionTrigger>
                <AccordionContent className="text-slate-300">
                  {t('faq.q4.answer')}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="md:col-span-1 h-fit bg-[#111116] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">{t('contact.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-3 h-12 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
              <MessageCircle className="w-5 h-5 text-green-400" />
              {t('contact.liveChat')}
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
              <Mail className="w-5 h-5 text-blue-400" />
              {t('contact.emailSupport')}
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
              <Phone className="w-5 h-5 text-slate-400" />
              +352 691 123 456
            </Button>
            
            <div className="pt-4 text-xs text-slate-500 text-center">
              {t('contact.businessHours')}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
