'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, Phone } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold tracking-tight">Central de Ajuda</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* FAQs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Como recarregar minha conta?</AccordionTrigger>
                <AccordionContent>
                  Vá até a Visão Geral e clique no botão &quot;Recarregar&quot;. Aceitamos cartões de crédito e débito via Stripe.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Quanto tempo demora uma transferência?</AccordionTrigger>
                <AccordionContent>
                  Transferências entre contas são instantâneas. Envios para cartões virtuais também são imediatos.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>O que é o Nível KYC?</AccordionTrigger>
                <AccordionContent>
                  É o nível de verificação da sua identidade. Quanto maior o nível, maiores são os limites de envio.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Meu cartão virtual funciona no Brasil?</AccordionTrigger>
                <AccordionContent>
                  Sim! Nossos cartões são emitidos em EUR/USD mas funcionam globalmente. A conversão é feita automaticamente na hora da compra.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Fale Conosco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-3 h-12">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Chat ao Vivo
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12">
              <Mail className="w-5 h-5 text-blue-600" />
              Email Suporte
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12">
              <Phone className="w-5 h-5 text-gray-600" />
              +352 691 123 456
            </Button>
            
            <div className="pt-4 text-xs text-gray-500 text-center">
              Horário de atendimento: Seg-Sex, 9h às 18h (CET).
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}