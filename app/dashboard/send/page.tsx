"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, CreditCard, User, CheckCircle2, ArrowRightLeft, ShieldCheck } from 'lucide-react';
// import { formatCurrency } from '@/lib/utils';

const GLOBAL_CURRENCIES = [
  // Major / Strong Currencies
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  
  // Emerging Markets / Remittance Destinations
  { code: 'BRL', name: 'Real Brasileiro', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'INR', name: 'Indian Rupee', flag: '��' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'TRY', name: 'Turkish Lira', flag: '��' },
  
  // Asia / Others
  { code: 'JPY', name: 'Japanese Yen', flag: '��' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
];

export default function SendMoneyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('EUR');
  const [toCurrency, setToCurrency] = useState('BRL');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quote, setQuote] = useState<any>(null);
  const [mode, setMode] = useState<'CARD_EMAIL' | 'ACCOUNT_CONTROLLED'>('CARD_EMAIL');
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');

  // Auto-switch currency logic removed to allow Global Card creation
  // We handle currency conversion in backend if needed

  // Auto-calculate quote with debounce
  useEffect(() => {
    const getQuote = async (isAuto = false) => {
      if (!amount) return;
      if (!isAuto) setLoading(true); // Only show loading spinner on manual click
      
      try {
        const res = await fetch('/api/transfers/quote', {
          method: 'POST',
          body: JSON.stringify({ fromCurrency, toCurrency, amount }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        setQuote(data);
        // Don't auto-advance step on auto-calc
        if (!isAuto) setStep(2);
      } catch (e) {
        console.error('Quote failed', e);
      } finally {
        if (!isAuto) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      if (amount && Number(amount) > 0) {
        getQuote(true); // Pass true to indicate auto-fetch (silent mode if needed)
      } else {
        setQuote(null);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [amount, fromCurrency, toCurrency]);

  // Step 1: Get Quote
  async function getQuote(isAuto = false) {
    if (!amount) return;
    if (!isAuto) setLoading(true); // Only show loading spinner on manual click
    
    try {
      const res = await fetch('/api/transfers/quote', {
        method: 'POST',
        body: JSON.stringify({ fromCurrency, toCurrency, amount }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setQuote(data);
      // Don't auto-advance step on auto-calc
      if (!isAuto) setStep(2);
    } catch (e) {
      console.error('Quote failed', e);
    } finally {
      if (!isAuto) setLoading(false);
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
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Enviar Dinheiro</h2>
        <p className="text-gray-500">Transfira globalmente em segundos com as melhores taxas.</p>
      </div>

      {/* Progress Steps Visual */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
              step >= s ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {s}
            </div>
            {s < 3 && (
              <div className={`w-16 h-1 bg-gray-200 mx-2 ${step > s ? 'bg-[var(--color-primary)]' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="card-premium border-0 shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
            <CardTitle className="text-xl text-gray-800">Quanto você quer enviar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-8">
            <div className="grid gap-6">
              
              {/* Source Amount */}
              <div className="relative">
                <Label className="text-gray-600 mb-2 block">Você envia</Label>
                <div className="flex items-center gap-4 p-4 border rounded-xl bg-white hover:border-[var(--color-primary)] transition-colors focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 focus-within:border-[var(--color-primary)]">
                  <Input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="1000.00"
                    className="border-0 bg-transparent text-3xl font-bold text-gray-900 p-0 h-auto focus-visible:ring-0 placeholder:text-gray-300"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 border-l pl-4">
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 w-[120px] font-bold text-xl p-0 h-auto gap-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GLOBAL_CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              <span className="text-xl">{c.flag}</span>
                              <span>{c.code}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Exchange Rate Info (Static for now) */}
              <div className="flex items-center gap-2 text-sm text-gray-500 px-2">
                 <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                 <div className="h-12 w-0.5 bg-gray-200 mx-auto hidden"></div> 
                 {/* Visual connector placeholder */}
                 <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Câmbio Comercial Estimado</span>
              </div>

              {/* Target Amount */}
              <div className="relative">
                <Label className="text-gray-600 mb-2 block">O destinatário recebe (Estimado)</Label>
                <div className="flex items-center gap-4 p-4 border rounded-xl bg-gray-50">
                  <Input 
                    disabled 
                    value={quote ? quote.estimatedReceived.toFixed(2) : ''}
                    placeholder="..." 
                    className="border-0 bg-transparent text-3xl font-bold text-gray-500 p-0 h-auto focus-visible:ring-0"
                  />
                  <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger className="border-0 bg-transparent shadow-none focus:ring-0 w-[120px] font-bold text-xl p-0 h-auto gap-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GLOBAL_CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              <span className="text-xl">{c.flag}</span>
                              <span>{c.code}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
          <CardFooter className="bg-gray-50/50 p-6 border-t border-gray-100">
            <Button onClick={() => getQuote(false)} disabled={!amount || loading} className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-lg h-12 shadow-lg hover:shadow-xl transition-all">
              {loading ? <Loader2 className="animate-spin" /> : 'Continuar'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && quote && (
        <Card className="card-premium border-0 shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
            <CardTitle className="text-xl text-gray-800">Para quem você está enviando?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            
            {/* Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-3 ${mode === 'CARD_EMAIL' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                onClick={() => setMode('CARD_EMAIL')}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${mode === 'CARD_EMAIL' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-500'}`}>
                   <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Cartão Virtual Global</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {!['EUR', 'USD', 'GBP'].includes(toCurrency) 
                      ? `Cartão emitido em USD/EUR. Funciona em ${toCurrency} via conversão automática.` 
                      : 'Envia um cartão Visa virtual por email. Uso imediato.'}
                  </p>
                </div>
              </div>

              <div 
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-3 ${mode === 'ACCOUNT_CONTROLLED' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                onClick={() => setMode('ACCOUNT_CONTROLLED')}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${mode === 'ACCOUNT_CONTROLLED' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-500'}`}>
                   <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Conta GlobalSecure</h3>
                  <p className="text-xs text-gray-500 mt-1">Transferência direta para outro usuário da plataforma.</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="space-y-2">
                <Label className="text-gray-700">Nome do Destinatário</Label>
                <Input 
                  value={receiverName} 
                  onChange={(e) => setReceiverName(e.target.value)} 
                  placeholder="Ex: Maria Silva"
                  className="bg-white border-gray-300 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Email do Destinatário</Label>
                <Input 
                  value={receiverEmail} 
                  onChange={(e) => setReceiverEmail(e.target.value)} 
                  placeholder="Ex: maria@email.com"
                  className="bg-white border-gray-300 h-11"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 bg-gray-50/50 p-6 border-t border-gray-100">
            <Button variant="outline" onClick={() => setStep(1)} className="h-11 px-6">Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={!receiverEmail || !receiverName} className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] h-11">
              Continuar
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && quote && (
        <Card className="card-premium border-0 shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
            <CardTitle className="text-xl text-gray-800">Revisar Transferência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-8">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Você envia</span>
                <span className="font-bold text-gray-900 text-lg">{quote.amountSource} {quote.fromCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Taxa (1.8%)</span>
                <span className="text-gray-900">- {quote.feeAmount.toFixed(2)} {quote.fromCurrency}</span>
              </div>
              <div className="h-px bg-blue-200 my-2"></div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Câmbio Comercial</span>
                <span className="text-gray-900">1 {quote.fromCurrency} = {quote.rate} {quote.toCurrency}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-600 font-medium">Destinatário recebe</span>
                <span className="font-bold text-emerald-600 text-2xl">{quote.estimatedReceived.toFixed(2)} {quote.toCurrency}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
               <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5" />
               <div className="text-sm">
                  <p className="text-gray-900 font-medium">Envio Seguro para {receiverName}</p>
                  <p className="text-gray-500">{receiverEmail} via {mode === 'CARD_EMAIL' ? 'Cartão Virtual' : 'Conta GlobalSecure'}</p>
               </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 bg-gray-50/50 p-6 border-t border-gray-100">
            <Button variant="outline" onClick={() => setStep(2)} className="h-11 px-6">Voltar</Button>
            <Button onClick={createTransfer} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 text-white shadow-md">
              {loading ? <Loader2 className="animate-spin" /> : 'Confirmar e Enviar'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card className="card-premium border-0 shadow-xl bg-white overflow-hidden py-12">
          <CardContent className="flex flex-col items-center space-y-6 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Sucesso!</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Sua transferência foi iniciada. Notificamos <strong>{receiverName}</strong> por email.
              </p>
            </div>
            <div className="pt-4">
               <Button onClick={() => router.push('/dashboard')} className="bg-gray-900 text-white hover:bg-gray-800 px-8 h-12 rounded-xl">
                 Voltar ao Dashboard
               </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}