'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, CreditCard, Lock, Unlock, Loader2, AlertCircle, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface VirtualCard {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  status: string; // ACTIVE, INACTIVE, CANCELED
  amount: number; // or Decimal
  currency: string;
  amountUsed: number; // or Decimal
  createdAt: Date;
}

interface CardsListProps {
  initialCards: any[]; // Using any[] to bypass complex Prisma types for now
}

export function CardsList({ initialCards }: CardsListProps) {
  const t = useTranslations('Cards');
  const [cards, setCards] = useState(initialCards);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<{ pan: string, cvv: string } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReveal = async (cardId: string) => {
    setLoadingId(cardId);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/reveal`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao revelar dados');
      }
      const data = await res.json();
      setCardDetails(data);
      setRevealedCardId(cardId);
      setIsDetailsOpen(true);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleStatus = async (cardId: string, currentStatus: string) => {
    alert(t('cardBlockUnavailable'));
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
        <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white">{t('noCardsFound')}</h3>
        <p className="text-slate-400 mt-1">{t('noActiveCards')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-950/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm border border-red-500/20">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.id} className="relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)] bg-[#111116] border-white/5 backdrop-blur-md group hover:border-cyan-500/20">
             <div className={cn(
              "absolute top-0 left-0 w-1 h-full transition-colors",
              card.status === 'ACTIVE' ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "bg-slate-600"
            )} />
            
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <CardHeader className="pb-2 relative z-10">
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <span className="capitalize tracking-tight">{card.brand}</span>
                </CardTitle>
                <Badge variant={card.status === 'ACTIVE' ? 'default' : 'secondary'} className={cn(
                    "uppercase text-[10px] tracking-wider font-bold",
                    card.status === 'ACTIVE' ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/20" : "bg-slate-800 text-slate-400"
                )}>
                  {card.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 relative z-10">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Número do Cartão</p>
                <div className="flex items-center gap-2 font-mono text-xl font-medium tracking-widest text-slate-200">
                  <span>•••• •••• •••• {card.last4}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Validade</p>
                  <p className="font-mono text-white">{String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">CVC</p>
                  <p className="font-mono text-white">•••</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Saldo Usado</span>
                    <span className="font-medium text-slate-300">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: card.currency }).format(Number(card.amountUsed))}
                    </span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Limite</span>
                    <span className="font-medium text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: card.currency }).format(Number(card.amount))}
                    </span>
                 </div>
                 {/* Progress Bar */}
                 <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                        style={{ width: `${Math.min((Number(card.amountUsed) / Number(card.amount)) * 100, 100)}%` }}
                    />
                 </div>
              </div>
            </CardContent>

            <CardFooter className="bg-black/20 p-4 flex gap-3 justify-end border-t border-white/5 relative z-10">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleToggleStatus(card.id, card.status)}
                disabled={loadingId === card.id}
                className="text-slate-400 hover:text-white hover:bg-white/5"
              >
                {card.status === 'ACTIVE' ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                {card.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'}
              </Button>
              
              <Button 
                size="sm"
                onClick={() => handleReveal(card.id)}
                disabled={loadingId === card.id}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]"
              >
                {loadingId === card.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Ver Dados
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Dados do Cartão</DialogTitle>
            <DialogDescription className="text-slate-400">
              Use estes dados para realizar compras online. Nunca compartilhe com terceiros.
            </DialogDescription>
          </DialogHeader>
          
          {cardDetails && (
            <div className="space-y-6 py-4">
              {/* Card Visualization */}
              <div className="relative aspect-[1.586/1] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-black border border-white/10 shadow-2xl">
                {/* Background Decor */}
                <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-cyan-500/20 blur-[80px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-500/20 blur-[80px] rounded-full" />
                
                <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <CreditCard className="w-8 h-8 text-cyan-400" />
                        <span className="font-bold text-white/50 tracking-widest text-sm">VIRTUAL</span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Número do Cartão</p>
                            <div className="flex items-center gap-3">
                                <p className="text-2xl font-mono font-bold tracking-widest text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] select-all">
                                    {cardDetails.pan}
                                </p>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => navigator.clipboard.writeText(cardDetails.pan)}>
                                    <Copy className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Validade</p>
                                <p className="text-lg font-mono font-medium text-white">
                                    {initialCards.find(c => c.id === revealedCardId)?.expMonth.toString().padStart(2, '0')}/
                                    {initialCards.find(c => c.id === revealedCardId)?.expYear.toString().slice(-2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">CVC</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-mono font-bold text-cyan-400 select-all">{cardDetails.cvv}</p>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => navigator.clipboard.writeText(cardDetails.cvv)}>
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              <div className="bg-amber-950/20 text-amber-400 p-3 rounded-lg text-xs flex gap-2 items-start border border-amber-500/20">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <p>Esta janela fechará automaticamente em breve por segurança. Certifique-se de que ninguém está olhando sua tela.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
