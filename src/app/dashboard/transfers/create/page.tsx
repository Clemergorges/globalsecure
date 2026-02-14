'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CreateTransferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    toEmail: '',
    amount: '',
    currency: 'EUR'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/transfers/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: formData.toEmail,
          amount: parseFloat(formData.amount),
          currency: formData.currency
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao realizar transferência');
      }

      setSuccess(true);
      toast({
        title: "Transferência Realizada",
        description: `Enviado ${formData.currency} ${formData.amount} para ${formData.toEmail}`,
      });
      
      // Reset form partially
      setFormData(prev => ({ ...prev, amount: '' }));
      
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6">
        <Card className="bg-[#111116] border-emerald-500/20 shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)]">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Transferência Enviada!</h2>
              <p className="text-slate-400">Seu dinheiro foi enviado com sucesso para {formData.toEmail}.</p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Voltar ao Início
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSuccess(false)}
                className="w-full border-white/10 text-slate-300 hover:bg-white/5"
              >
                Nova Transferência
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Nova Transferência</h1>
        <p className="text-slate-400">Envie dinheiro instantaneamente para outros usuários.</p>
      </div>

      <Card className="bg-[#111116] border-white/5 backdrop-blur-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-white">Detalhes do Envio</CardTitle>
            <CardDescription className="text-slate-500">
              Transferências internas são processadas imediatamente.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-950/20 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email do Destinatário</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                required
                className="bg-black/20 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
                value={formData.toEmail}
                onChange={(e) => setFormData({...formData, toEmail: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-slate-300">Valor</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-slate-300">Moeda</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(val) => setFormData({...formData, currency: val})}
                >
                  <SelectTrigger className="bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0F] border-white/10 text-white">
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                    <SelectItem value="GBP">Libra (GBP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-cyan-950/10 p-4 rounded-lg border border-cyan-500/10">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-400">Taxa de Serviço (1.8%)</span>
                <span className="text-slate-300 font-mono">
                  {formData.amount ? (parseFloat(formData.amount) * 0.018).toFixed(2) : '0.00'} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-cyan-500/10">
                <span className="text-cyan-400">Total a Pagar</span>
                <span className="text-white font-mono">
                  {formData.amount ? (parseFloat(formData.amount) * 1.018).toFixed(2) : '0.00'} {formData.currency}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.toEmail || !formData.amount}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold min-w-[140px] shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <span className="flex items-center">
                  Enviar Agora <ArrowRight className="w-4 h-4 ml-2" />
                </span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
