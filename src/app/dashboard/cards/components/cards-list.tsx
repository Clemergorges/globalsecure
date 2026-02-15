
'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, CreditCard, Lock, Unlock, Loader2, AlertCircle, Copy, Plus, Trash2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { SecureTransferDialog } from './secure-transfer-dialog';

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

const VisaLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 10"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Visa Logo"
  >
    <path d="M12.727 0.444h-2.19c-0.686 0-1.206 0.2-1.464 0.929l-4.162 9.851h2.957l0.591-1.638h3.615l0.342 1.638h2.606l-2.295-10.78zM10.875 7.674l1.107-5.328 1.874 5.328h-2.981zM20.254 7.218c0.165-0.74 0.998-1.155 1.756-1.196 0.598-0.033 2.257 0.116 2.946 0.796l0.522-2.453c-0.697-0.24-1.606-0.432-2.735-0.432-3.018 0-5.145 1.606-5.155 3.911-0.016 1.701 1.517 2.651 2.673 3.214 1.189 0.579 1.59 0.954 1.583 1.474-0.012 0.796-0.954 1.161-1.832 1.161-1.222 0-1.876-0.183-2.868-0.607l-0.503 2.359c0.64 0.298 1.821 0.556 3.045 0.556 3.193 0 5.275-1.574 5.293-4.016 0.009-1.339-0.798-2.358-2.544-3.193-1.062-0.531-1.714-0.89-1.714-1.432-0.001-0.488 0.548-0.993 1.93-0.993zM28.37 0.444h-2.264c-0.702 0-1.229 0.407-1.535 1.14l-5.443 12.871h3.084l0.616-1.705h3.765c0.179 0.816 0.643 1.705 0.72 1.705h2.723l-1.666-13.011zM6.612 0.444h-2.946l-1.85 11.233c-0.066 0.283-0.283 0.366-0.65 0.466l-1.165 0.266 0.174 0.816 3.635 0.816c0.824 0 1.229-0.623 1.272-0.992l2.362-12.605z" />
  </svg>
);

export function CardsList({ initialCards }: CardsListProps) {
  const t = useTranslations('Cards');
  const router = useRouter();
  const { toast } = useToast();
  const [cards, setCards] = useState(initialCards);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<{ pan: string, cvv: string } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Card State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCardCurrency, setNewCardCurrency] = useState('EUR');

  // Delete Card State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Secure Transfer State
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const handleCreateCard = async () => {
    setCreateLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'VIRTUAL',
          currency: newCardCurrency,
          limit: 1000 // Default limit, could be an input
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create card');
      }

      const { card } = await res.json();
      
      // Add new card to list (optimistic update or refresh)
      setCards([card, ...cards]);
      setIsCreateOpen(false);
      router.refresh(); // Refresh server components
      toast({
        title: "Sucesso",
        description: "Cartão virtual criado com sucesso.",
      });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

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

  const confirmDelete = (cardId: string) => {
    setCardToDelete(cardId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/cards/${cardToDelete}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao excluir cartão');
      }

      // Optimistic Update
      setCards(cards.filter(c => c.id !== cardToDelete));
      setDeleteConfirmOpen(false);
      setCardToDelete(null);
      toast({
        title: "Sucesso",
        description: "Cartão removido com sucesso.",
        variant: "default",
      });
      router.refresh();

    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível remover o cartão.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (cardId: string, currentStatus: string) => {
    alert(t('cardBlockUnavailable'));
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-white/5 p-6 rounded-full mb-6">
            <VisaLogo className="w-16 h-8 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{t('noCardsFound')}</h3>
        <p className="text-slate-400 max-w-md mx-auto mb-8 text-lg">{t('noActiveCards')}</p>
        <div className="flex gap-4">
            <Button onClick={() => setIsTransferOpen(true)} variant="outline" className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 font-bold h-12 px-8 rounded-full transition-transform hover:scale-105">
              <Send className="w-5 h-5 mr-2" />
              Global Link
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-12 px-8 rounded-full shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] transition-transform hover:scale-105">
              <Plus className="w-5 h-5 mr-2" />
              Criar Meu Primeiro Cartão
            </Button>
        </div>

        <SecureTransferDialog 
          open={isTransferOpen} 
          onOpenChange={setIsTransferOpen} 
          onSuccess={() => {
            router.refresh();
            toast({ title: "Sucesso", description: "Transferência via Link Seguro iniciada!" });
          }}
        />

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Cartão Virtual</DialogTitle>
            <DialogDescription className="text-slate-400">
              Crie um cartão virtual instantaneamente para compras online seguras.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={newCardCurrency} onValueChange={setNewCardCurrency}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="GBP">Libra (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">Cancelar</Button>
            <Button onClick={handleCreateCard} disabled={createLoading} className="bg-cyan-500 text-black hover:bg-cyan-600">
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Cartão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

      <div className="flex justify-end gap-3">
        <Button onClick={() => setIsTransferOpen(true)} variant="outline" className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 font-medium">
          <Send className="w-4 h-4 mr-2" />
          Global Link
        </Button>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium shadow-[0_0_15px_-5px_rgba(6,182,212,0.5)]">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cartão
        </Button>
      </div>

      <SecureTransferDialog 
        open={isTransferOpen} 
        onOpenChange={setIsTransferOpen} 
        onSuccess={() => {
          router.refresh();
          toast({ title: "Sucesso", description: "Transferência via Link Seguro iniciada!" });
        }}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Create New Card Tile */}
        <button 
            onClick={() => setIsCreateOpen(true)}
            className="group relative h-full min-h-[280px] rounded-xl border-2 border-dashed border-white/10 bg-white/5 p-6 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-4 text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0F]"
        >
            <div className="p-4 rounded-full bg-white/5 group-hover:bg-cyan-500/10 transition-colors">
                <Plus className="w-8 h-8 text-slate-400 group-hover:text-cyan-400" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-400">Criar Novo Cartão</h3>
                <p className="text-sm text-slate-400 mt-1">Gere um cartão virtual instantâneo</p>
            </div>
        </button>

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
                  <VisaLogo className="w-12 h-4 text-white" />
                  <span className="sr-only">Visa</span>
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

            <CardFooter className="bg-black/20 p-4 flex gap-2 justify-end border-t border-white/5 relative z-10">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => confirmDelete(card.id)}
                className="text-slate-400 hover:text-red-400 hover:bg-red-950/20 mr-auto"
                aria-label="Remover cartão"
              >
                <Trash2 className="w-4 h-4" />
              </Button>

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
                        <VisaLogo className="w-16 h-6 text-white" />
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

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Cartão Virtual</DialogTitle>
            <DialogDescription className="text-slate-400">
              Crie um cartão virtual instantaneamente para compras online seguras.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={newCardCurrency} onValueChange={setNewCardCurrency}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="GBP">Libra (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">Cancelar</Button>
            <Button onClick={handleCreateCard} disabled={createLoading} className="bg-cyan-500 text-black hover:bg-cyan-600">
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Cartão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Remover Cartão</DialogTitle>
                <DialogDescription className="text-slate-400">
                    Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} className="text-slate-400 hover:text-white">
                    Cancelar
                </Button>
                <Button 
                    onClick={handleDeleteCard} 
                    disabled={deleteLoading}
                    className="bg-red-600 text-white hover:bg-red-700"
                >
                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover Cartão'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
