
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Upload, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function KYCPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Info, 2: Docs, 3: Success
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    documentType: 'passport',
    documentNumber: '',
    issuingCountry: 'LU',
    frontImageUrl: '', // Mock URL for MVP
    backImageUrl: '',
    selfieUrl: ''
  });

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch('/api/kyc/status');
      const data = await res.json();
      setStatus(data.status);
      if (data.status === 'REJECTED') {
        setRejectionReason(data.lastSubmission?.rejectionReason);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Simulation: We just send text URLs. In real app, we'd upload to blob storage first.
      const payload = {
        ...formData,
        // Mocking URLs if empty for simulation
        frontImageUrl: formData.frontImageUrl || 'https://mock.com/front.jpg',
        backImageUrl: formData.backImageUrl || 'https://mock.com/back.jpg',
        selfieUrl: formData.selfieUrl || 'https://mock.com/selfie.jpg'
      };

      const res = await fetch('/api/kyc/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Upload failed');

      setStatus('PENDING');
      setStep(3);
    } catch (error) {
      alert('Failed to submit KYC documents');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (status === 'APPROVED') {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Conta Verificada!</h1>
        <p className="text-gray-500 mb-6">Você tem acesso total a todos os recursos do GlobalSecureSend.</p>
        <Button onClick={() => router.push('/dashboard')}>Ir para o Dashboard</Button>
      </div>
    );
  }

  if (status === 'PENDING' && step !== 3) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Verificação em Análise</h1>
        <p className="text-gray-500 mb-6">Seus documentos estão sendo analisados. Isso geralmente leva menos de 24 horas.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Verificação de Identidade</h1>
        <p className="text-gray-500">Para garantir a segurança da plataforma e cumprir regulações, precisamos verificar quem você é.</p>
      </div>

      {status === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3">
          <XCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-bold">Verificação Falhou</p>
            <p className="text-sm">{rejectionReason || 'Por favor envie documentos mais claros.'}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Passo 1: Informações do Documento'}
            {step === 2 && 'Passo 2: Upload de Imagens'}
            {step === 3 && 'Envio Concluído'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Selecione o tipo de documento que deseja enviar.'}
            {step === 2 && 'Envie fotos claras da frente e verso do seu documento.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <select 
                  className="w-full p-2 border rounded-md bg-background"
                  value={formData.documentType}
                  onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                >
                  <option value="passport">Passaporte</option>
                  <option value="id_card">Carteira de Identidade (RG)</option>
                  <option value="driver_license">Carteira de Motorista (CNH)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Número do Documento</Label>
                <Input 
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                  placeholder="Ex: A1234567"
                />
              </div>

              <div className="space-y-2">
                <Label>País de Emissão (Código ISO 2 letras)</Label>
                <Input 
                  value={formData.issuingCountry}
                  onChange={(e) => setFormData({...formData, issuingCountry: e.target.value.toUpperCase()})}
                  placeholder="Ex: BR, LU, US"
                  maxLength={2}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="font-medium">Frente do Documento</p>
                <p className="text-xs text-gray-400">Clique para selecionar (Simulado)</p>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="font-medium">Verso do Documento</p>
                <p className="text-xs text-gray-400">Clique para selecionar (Simulado)</p>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="font-medium">Selfie com Documento</p>
                <p className="text-xs text-gray-400">Clique para selecionar (Simulado)</p>
              </div>
              
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                * Nota: Como este é um ambiente de demonstração, nenhum arquivo real será enviado. Apenas clique em "Enviar" para simular o processo.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Documentos Enviados!</h3>
              <p className="text-gray-500">
                Nossa equipe irá analisar seus documentos em breve.
                Você será notificado assim que o status mudar.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step === 1 && (
             <Button className="w-full" onClick={() => setStep(2)} disabled={!formData.documentNumber}>
               Continuar
             </Button>
          )}
          
          {step === 2 && (
            <div className="flex gap-4 w-full">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin mr-2" /> : null}
                Enviar para Análise
              </Button>
            </div>
          )}

          {step === 3 && (
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
