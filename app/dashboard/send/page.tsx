"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowRight, CreditCard, User, CheckCircle } from 'lucide-react';

export default function SendMoneyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState('BRL');
  const [quote, setQuote] = useState<any>(null);
  const [mode, setMode] = useState<'CARD_EMAIL' | 'ACCOUNT_CONTROLLED'>('CARD_EMAIL');
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');

  // Step 1: Get Quote
  async function getQuote() {
    if (!amount) return;
    setLoading(true);
    try {
      const res = await fetch('/api/transfers/quote', {
        method: 'POST',
        body: JSON.stringify({ fromCurrency, toCurrency, amount }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setQuote(data);
      setStep(2);
    } catch (e) {
      alert('Failed to get quote');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Create Transfer
  async function createTransfer() {
    setLoading(true);
    try {
      const res = await fetch('/api/transfers/create', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          amountSource: amount,
          currencySource: fromCurrency,
          currencyTarget: toCurrency,
          receiverEmail,
          receiverName
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        setStep(4); // Success
      } else {
        alert('Failed to create transfer');
      }
    } catch (e) {
      alert('Error creating transfer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Send Money</h2>

      {/* Progress Steps */}
      <div className="flex justify-between mb-8 text-sm">
        <span className={step >= 1 ? 'text-blue-500 font-bold' : 'text-slate-500'}>1. Amount</span>
        <span className={step >= 2 ? 'text-blue-500 font-bold' : 'text-slate-500'}>2. Recipient</span>
        <span className={step >= 3 ? 'text-blue-500 font-bold' : 'text-slate-500'}>3. Review</span>
      </div>

      {step === 1 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>How much would you like to send?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>You Send</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="100.00"
                    className="bg-slate-800 border-slate-700"
                  />
                  <select 
                    value={fromCurrency} 
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="bg-slate-800 border-slate-700 rounded-md px-2"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="BRL">BRL</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Recipient Gets (Estimated)</Label>
                <div className="flex gap-2">
                  <Input 
                    disabled 
                    placeholder="..." 
                    className="bg-slate-800 border-slate-700 opacity-50"
                  />
                  <select 
                    value={toCurrency} 
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="bg-slate-800 border-slate-700 rounded-md px-2"
                  >
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={getQuote} disabled={!amount || loading} className="w-full bg-blue-600 hover:bg-blue-500">
              {loading ? <Loader2 className="animate-spin" /> : 'Continue'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && quote && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>How should they receive it?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 rounded-lg border cursor-pointer transition-all ${mode === 'CARD_EMAIL' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`}
                onClick={() => setMode('CARD_EMAIL')}
              >
                <CreditCard className="w-6 h-6 mb-2 text-blue-400" />
                <h3 className="font-bold">Virtual Card</h3>
                <p className="text-xs text-slate-400">Send a card via email. They can spend instantly online or add to wallet.</p>
              </div>
              <div 
                className={`p-4 rounded-lg border cursor-pointer transition-all ${mode === 'ACCOUNT_CONTROLLED' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`}
                onClick={() => setMode('ACCOUNT_CONTROLLED')}
              >
                <User className="w-6 h-6 mb-2 text-purple-400" />
                <h3 className="font-bold">GlobalSecure Account</h3>
                <p className="text-xs text-slate-400">Send directly to their account on our platform.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Name</Label>
                <Input 
                  value={receiverName} 
                  onChange={(e) => setReceiverName(e.target.value)} 
                  placeholder="Maria Silva"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input 
                  value={receiverEmail} 
                  onChange={(e) => setReceiverEmail(e.target.value)} 
                  placeholder="maria@example.com"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!receiverEmail || !receiverName} className="flex-1 bg-blue-600 hover:bg-blue-500">
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && quote && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Review Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-800 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">You Send</span>
                <span className="font-bold">{quote.amountSource} {quote.fromCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fee (1.8%)</span>
                <span>- {quote.feeAmount.toFixed(2)} {quote.fromCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exchange Rate</span>
                <span>1 {quote.fromCurrency} = {quote.rate} {quote.toCurrency}</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between text-lg font-bold text-green-400">
                <span>Recipient Gets</span>
                <span>{quote.estimatedReceived.toFixed(2)} {quote.toCurrency}</span>
              </div>
            </div>

            <div className="text-sm text-slate-400">
              Sending to: <span className="text-white font-medium">{receiverName}</span> ({receiverEmail}) via <span className="text-white font-medium">{mode === 'CARD_EMAIL' ? 'Virtual Card' : 'Account Transfer'}</span>.
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={createTransfer} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-500">
              {loading ? <Loader2 className="animate-spin" /> : 'Confirm & Send'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card className="bg-slate-900 border-slate-800 text-center py-8">
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">Transfer Sent!</h2>
            <p className="text-slate-400 max-w-xs mx-auto">
              We've notified {receiverName}. You can track the status in your dashboard.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
