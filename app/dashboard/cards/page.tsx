"use client";

import { useState, useEffect } from 'react';
// Removed unused imports
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, CreditCard, Copy, Loader2, Plus, Power } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CardData {
  id: string;
  brand: string;
  last4: string;
  amount: number;
  currency: string;
  status: string;
}

interface CardDetails {
  fullPan?: string;
  pan?: string;
  cardholderName?: string;
  exp?: string;
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedCard, setRevealedCard] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCardAmount, setNewCardAmount] = useState('');
  const [newCardCurrency, setNewCardCurrency] = useState('EUR');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  async function fetchCards() {
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCard() {
    if (!newCardAmount) return;
    setCreating(true);
    try {
        const res = await fetch('/api/cards/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: parseFloat(newCardAmount),
                currency: newCardCurrency,
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setIsCreateOpen(false);
        setNewCardAmount('');
        fetchCards(); // Refresh list
        alert('Card created successfully!');
    } catch (e: any) {
        alert(e.message || 'Failed to create card');
    } finally {
        setCreating(false);
    }
  }

  async function handleActivateCard(cardId: string) {
      try {
          const res = await fetch(`/api/cards/${cardId}/activate`, { method: 'POST' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          fetchCards(); // Refresh
          alert('Card activated!');
      } catch (e: any) {
          alert(e.message || 'Failed to activate');
      }
  }

  async function toggleReveal(cardId: string) {
    if (revealedCard === cardId) {
      setRevealedCard(null);
      setCardDetails(null);
      return;
    }

    try {
      const res = await fetch(`/api/cards/${cardId}/reveal`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCardDetails(data);
      setRevealedCard(cardId);
    } catch (e) {
      console.error(e); // Log error
      alert('Failed to reveal card details');
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Cards</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Create New Card</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Virtual Card</DialogTitle>
                    <DialogDescription>
                        This will create a new virtual card funded from your wallet balance.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select value={newCardCurrency} onValueChange={setNewCardCurrency}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Initial Limit (Amount)</Label>
                        <Input 
                            type="number" 
                            placeholder="e.g. 50" 
                            value={newCardAmount}
                            onChange={(e) => setNewCardAmount(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateCard} disabled={creating}>
                        {creating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create Card'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.id} className="relative group perspective">
            <div className={`relative h-56 rounded-xl transition-all duration-500 transform bg-gradient-to-br ${card.brand === 'Visa' ? 'from-blue-700 to-blue-900' : 'from-orange-600 to-red-800'} p-6 text-white shadow-xl`}>
              <div className="flex justify-between items-start mb-8">
                <div className="font-bold text-lg tracking-wider italic">{card.brand}</div>
                <CreditCard className="w-8 h-8 opacity-50" />
              </div>
              
              <div className="space-y-1 mb-6">
                <div className="text-xs opacity-75">Card Number</div>
                <div className="text-xl font-mono tracking-widest flex items-center gap-2">
                  {revealedCard === card.id ? (
                    <>
                      {cardDetails?.fullPan || cardDetails?.pan}
                      <Copy className="w-4 h-4 cursor-pointer hover:text-blue-300" onClick={() => navigator.clipboard.writeText(cardDetails?.fullPan || cardDetails?.pan || '')} />
                    </>
                  ) : (
                    `•••• •••• •••• ${card.last4}`
                  )}
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs opacity-75">Cardholder</div>
                  <div className="font-medium uppercase tracking-wide">
                    {revealedCard === card.id ? cardDetails?.cardholderName : 'Valued Customer'}
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-xs opacity-75">Expires</div>
                   <div className="font-mono">
                     {revealedCard === card.id ? cardDetails?.exp : '**/**'}
                   </div>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 flex gap-2">
                 {card.status === 'INACTIVE' && (
                     <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-white hover:bg-green-500/50"
                        title="Activate Card"
                        onClick={() => handleActivateCard(card.id)}
                     >
                        <Power className="w-4 h-4" />
                     </Button>
                 )}
                 <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20"
                    onClick={() => toggleReveal(card.id)}
                  >
                    {revealedCard === card.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                 </Button>
              </div>
            </div>
            
            <div className="mt-2 flex justify-between text-sm text-slate-400 px-1">
              <span>Limit: {formatCurrency(Number(card.amount), card.currency || 'USD')}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${card.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                {card.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">You don't have any virtual cards yet.</p>
        </div>
      )}
    </div>
  );
}
