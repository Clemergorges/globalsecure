'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowDownLeft, QrCode, Building, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DepositPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');

  const handlePixDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/wallet/deposit/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha no depósito');
      }

      toast({
        title: "Depósito Confirmado",
        description: `Recebemos seu PIX de R$ ${amount} com sucesso!`,
      });
      
      router.push('/dashboard');
      router.refresh();
      
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Depositar Fundos</h1>
        <p className="text-slate-400">Escolha como você quer adicionar dinheiro à sua conta.</p>
      </div>

      <Tabs defaultValue="pix" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#111116] border border-white/5 p-1 h-auto">
          <TabsTrigger value="pix" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black py-3">
            <QrCode className="w-4 h-4 mr-2" /> PIX (Brasil)
          </TabsTrigger>
          <TabsTrigger value="crypto" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white py-3">
            <Wallet className="w-4 h-4 mr-2" /> Cripto
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-white data-[state=active]:text-black py-3">
            <Building className="w-4 h-4 mr-2" /> Transferência
          </TabsTrigger>
        </TabsList>

        {/* PIX Tab */}
        <TabsContent value="pix">
          <Card className="bg-[#111116] border-white/5 mt-4 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Depósito Instantâneo via PIX
              </CardTitle>
              <CardDescription className="text-slate-500">
                O valor será creditado na sua conta em segundos. (Simulação)
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePixDeposit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pix-amount" className="text-slate-300">Valor (BRL)</Label>
                  <Input
                    id="pix-amount"
                    type="number"
                    placeholder="0.00"
                    min="1"
                    required
                    className="bg-black/20 border-white/10 text-white focus:border-cyan-500/50 text-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="bg-cyan-900/10 p-4 rounded text-sm text-cyan-200 border border-cyan-500/10">
                  <p>💡 Em ambiente de produção, isso geraria um QR Code. Para testes, o valor é creditado automaticamente.</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={loading || !amount}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar PIX e Pagar'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Crypto Tab */}
        <TabsContent value="crypto">
          <Card className="bg-[#111116] border-white/5 mt-4 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Depósito em USDT</CardTitle>
              <CardDescription className="text-slate-500">
                Envie USDT via rede Polygon (MATIC).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="bg-white p-4 inline-block rounded-xl mb-4">
                {/* Placeholder QR */}
                <div className="w-32 h-32 bg-black/10" />
              </div>
              <p className="text-sm text-slate-400 mb-2">Seu endereço de depósito:</p>
              <code className="bg-black/30 px-3 py-1 rounded text-purple-400 font-mono text-sm block mb-4 break-all">
                0x71C7656EC7ab88b098defB751B7401B5f6d8976F
              </code>
              <p className="text-xs text-slate-500">
                Apenas envie USDT (Polygon). Outros tokens podem ser perdidos permanentemente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Tab */}
        <TabsContent value="bank">
          <Card className="bg-[#111116] border-white/5 mt-4 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Transferência Bancária (IBAN)</CardTitle>
              <CardDescription className="text-slate-500">
                Para depósitos maiores via SEPA ou SWIFT.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Beneficiário</span>
                  <span className="text-white font-medium">Global Secure Send Ltd.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">IBAN</span>
                  <span className="text-white font-mono">LU88 0000 0000 0000 0000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">BIC/SWIFT</span>
                  <span className="text-white font-mono">GSSLULLL</span>
                </div>
              </div>
              <div className="bg-amber-900/10 p-3 rounded text-sm text-amber-200 border border-amber-500/10">
                <p>⚠️ O tempo de processamento pode levar de 1 a 3 dias úteis.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
