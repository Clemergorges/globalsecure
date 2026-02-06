'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, Shield, Loader2, AlertCircle, ScanFace } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function KYCPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentType: 'id_card',
    documentNumber: '',
    issuingCountry: 'LU'
  });
  const [files, setFiles] = useState<{ front?: File; back?: File; selfie?: File }>({});

  useEffect(() => {
    if (searchParams.get('session_id')) {
        setStep(5);
    }
  }, [searchParams]);

  const handleFileChange = (key: 'front' | 'back' | 'selfie', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
    }
  };

  const handleStripeIdentity = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/kyc/stripe-identity', { method: 'POST' });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Erro ao iniciar verificação automática.');
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao conectar com Stripe Identity.');
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      // Dados do documento
      data.append('documentType', formData.documentType);
      data.append('documentNumber', formData.documentNumber);
      data.append('issuingCountry', formData.issuingCountry);
      
      // Arquivos
      if (files.front) data.append('front', files.front);
      if (files.back) data.append('back', files.back);
      if (files.selfie) data.append('selfie', files.selfie);

      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        body: data,
      });

      if (res.ok) {
        setStep(5); // Sucesso
      } else {
        alert('Erro ao enviar documentos.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Verificação de Identidade</h1>
        <p className="text-gray-500">Para aumentar seus limites e garantir a segurança, precisamos verificar quem você é.</p>
      </div>

      {step === 5 ? (
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900 mb-2">Documentos Enviados!</h2>
            <p className="text-emerald-700 mb-6 max-w-md mx-auto">
              Sua verificação está sendo processada. Você receberá um e-mail assim que aprovado.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
            {/* Opção Rápida (Stripe Identity) */}
            <Card className="mb-6 border-blue-200 bg-blue-50/50 overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    RECOMENDADO
                </div>
                <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <ScanFace className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-blue-900">Verificação Automática</h3>
                            <p className="text-blue-700 text-sm">Use sua câmera para verificar em segundos. Mais seguro e rápido.</p>
                        </div>
                    </div>
                    <Button onClick={handleStripeIdentity} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Iniciar Agora'}
                    </Button>
                </CardContent>
            </Card>

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">ou envio manual</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <Card>
            <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                {[0, 1, 2, 3].map((s) => (
                    <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-[var(--color-primary)]' : 'text-gray-300'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${step >= s ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-gray-200'}`}>
                        {s + 1}
                    </div>
                    {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`} />}
                    </div>
                ))}
                </div>
                <CardTitle>
                {step === 0 && 'Dados do Documento'}
                {step === 1 && 'Documento de Identidade (Frente)'}
                {step === 2 && 'Documento de Identidade (Verso)'}
                {step === 3 && 'Selfie de Verificação'}
                </CardTitle>
                <CardDescription>
                {step === 0 && 'Informe os dados do documento que você enviará.'}
                {step === 1 && 'Envie uma foto clara da frente do seu Passaporte, RG ou CNH.'}
                {step === 2 && 'Agora envie uma foto do verso do documento.'}
                {step === 3 && 'Por fim, tire uma selfie segurando o documento para provar que é você.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {step === 0 && (
                <div className="space-y-4">
                    <div>
                    <Label>Tipo de Documento</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.documentType}
                        onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                    >
                        <option value="id_card">Carteira de Identidade (ID Card)</option>
                        <option value="passport">Passaporte</option>
                        <option value="driver_license">Carteira de Motorista</option>
                    </select>
                    </div>
                    <div>
                    <Label>Número do Documento</Label>
                    <Input 
                        value={formData.documentNumber}
                        onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                        placeholder="Ex: 123456789"
                    />
                    </div>
                    <div>
                    <Label>País de Emissão</Label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.issuingCountry}
                        onChange={(e) => setFormData({...formData, issuingCountry: e.target.value})}
                    >
                        <option value="LU">Luxemburgo (LU)</option>
                        <option value="BR">Brasil (BR)</option>
                        <option value="US">Estados Unidos (US)</option>
                        <option value="PT">Portugal (PT)</option>
                        <option value="FR">França (FR)</option>
                        <option value="DE">Alemanha (DE)</option>
                    </select>
                    </div>
                </div>
                )}

                {step > 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                    <Input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleFileChange(step === 1 ? 'front' : step === 2 ? 'back' : 'selfie', e)}
                    />
                    <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Clique para selecionar ou arraste aqui</p>
                        <p className="text-sm text-gray-500 mt-1">JPG, PNG ou PDF (Max 5MB)</p>
                    </div>
                    {((step === 1 && files.front) || (step === 2 && files.back) || (step === 3 && files.selfie)) && (
                        <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Arquivo selecionado
                        </div>
                    )}
                    </div>
                </div>
                )}

                <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || loading}>
                    Voltar
                </Button>
                
                {step < 3 ? (
                    <Button 
                    onClick={() => setStep(s => s + 1)} 
                    disabled={
                        (step === 0 && (!formData.documentNumber)) ||
                        (step === 1 && !files.front) || 
                        (step === 2 && !files.back)
                    }
                    >
                    Próximo
                    </Button>
                ) : (
                    <Button 
                    onClick={handleSubmit} 
                    disabled={!files.selfie || loading}
                    className="bg-[var(--color-primary)] text-white"
                    >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                    Enviar para Análise
                    </Button>
                )}
                </div>

            </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}