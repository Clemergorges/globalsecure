'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, CheckCircle, Copy, AlertCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SecureTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SecureTransferDialog({ open, onOpenChange, onSuccess }: SecureTransferDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Success state
  const [successData, setSuccessData] = useState<{
    claimUrl: string;
    unlockCode: string;
    recipientEmail: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    amount: '',
    currency: 'EUR',
    message: ''
  });

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a delay to allow animation to finish
    setTimeout(() => {
      setSuccessData(null);
      setFormData({
        recipientName: '',
        recipientEmail: '',
        amount: '',
        currency: 'EUR',
        message: ''
      });
      setError(null);
    }, 300);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    if (!formData.recipientEmail || !formData.amount) {
      setError('Email e valor são obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/claim-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          message: formData.message
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao processar envio.');
      }

      const data = await res.json();
      
      setSuccessData({
        claimUrl: data.claimUrl,
        unlockCode: data.unlockCode,
        recipientEmail: formData.recipientEmail
      });
      
      onSuccess(); // Refresh list in parent

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render Success View
  if (successData) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-cyan-500" />
            </div>
            <DialogTitle className="text-center text-xl">Envio Realizado com Sucesso!</DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              O link de pagamento seguro foi gerado e enviado para <strong>{successData.recipientEmail}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-cyan-500 text-sm uppercase tracking-wider mb-1">Código de Segurança</h4>
                  <p className="text-cyan-200/80 text-sm">
                    Para garantir a segurança da transação, este código <strong>NÃO</strong> foi enviado por email. Você deve fornecê-lo ao destinatário por um canal seguro.
                  </p>
                </div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between border border-cyan-500/10">
                <div>
                  <p className="text-[10px] text-cyan-500/70 uppercase tracking-widest mb-1">Código de Desbloqueio</p>
                  <p className="font-mono text-xl font-bold text-cyan-400 tracking-widest">{successData.unlockCode}</p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/10"
                  onClick={() => {
                    navigator.clipboard.writeText(successData.unlockCode);
                    toast({ title: "Copiado", description: "Código copiado para a área de transferência" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Link de Acesso (Backup)</Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={successData.claimUrl} 
                  className="bg-white/5 border-white/10 text-slate-400 font-mono text-xs"
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="shrink-0 border-white/10 hover:bg-white/5"
                  onClick={() => {
                    navigator.clipboard.writeText(successData.claimUrl);
                    toast({ title: "Copiado", description: "Link copiado para a área de transferência" });
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full bg-cyan-500 text-black hover:bg-cyan-600 font-bold">
              Concluir Transação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Render Form View
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A0A0F] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-500" />
            Global Link (Transferência Segura)
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Envie valores instantaneamente para qualquer pessoa via link seguro descentralizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-950/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input 
                id="amount"
                type="number" 
                placeholder="0.00" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="bg-white/5 border-white/10 text-white font-mono text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(val) => setFormData({...formData, currency: val})}
              >
                <SelectTrigger id="currency" className="bg-white/5 border-white/10 text-white h-10">
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

          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Email do Destinatário</Label>
            <Input 
              id="recipientEmail"
              type="email" 
              placeholder="exemplo@email.com" 
              value={formData.recipientEmail}
              onChange={(e) => setFormData({...formData, recipientEmail: e.target.value})}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Nome do Destinatário (Opcional)</Label>
            <Input 
              id="recipientName"
              placeholder="João Silva" 
              value={formData.recipientName}
              onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Nota de Transferência (Opcional)</Label>
            <Textarea 
              id="message"
              placeholder="Descrição do pagamento ou mensagem..." 
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              className="bg-white/5 border-white/10 text-white resize-none h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-cyan-500 text-black hover:bg-cyan-600 font-medium">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Global Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
