"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, CreditCard, Copy, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function CardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedCard, setRevealedCard] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);

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
      alert('Failed to reveal card details');
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Cards</h2>
        <Button>Create New Card</Button>
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
                      <Copy className="w-4 h-4 cursor-pointer hover:text-blue-300" onClick={() => navigator.clipboard.writeText(cardDetails?.fullPan || cardDetails?.pan)} />
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

              <div className="absolute bottom-4 right-4">
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
