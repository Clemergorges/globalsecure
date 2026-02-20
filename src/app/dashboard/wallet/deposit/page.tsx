'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowDownLeft, QrCode, Building, Wallet, Euro, Globe, CheckCircle, Upload, FileText, ChevronRight, Landmark, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { getUserProfile } from '@/app/actions/get-user-profile';
import { cn } from '@/lib/utils';

export default function DepositPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('WalletDeposit');
  const tc = useTranslations('Common');
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  
  const [profile, setProfile] = useState<{ country: string, currency: string } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string>('');

  // Wizard State for Bank Transfer
  const [transferStep, setTransferStep] = useState(1);
  const [proofFile, setFile] = useState<File | null>(null);

  useEffect(() => {
    getUserProfile().then(data => {
      if (data) {
        setProfile(data);
        setDetectedCountry(data.country);
      }
    });

    fetch('/api/geo').then(res => res.json()).then(geo => {
        if (geo.country && geo.country !== 'BR') {
             // Logic to suggest country
        }
    }).catch(err => console.error(err));
  }, []);

  const handleCountryChange = (value: string) => {
      setDetectedCountry(value);
      const currencyMap: Record<string, string> = {
          'BR': 'BRL', 'US': 'USD', 'GB': 'GBP',
          'LU': 'EUR', 'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'PT': 'EUR', 'IT': 'EUR'
      };
      const newCurrency = currencyMap[value] || 'USD';
      setProfile({ country: value, currency: newCurrency });
      setSelectedMethod(null); // Reset selection on country change
  };

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
      if (!res.ok) throw new Error(data.error || 'Falha no depósito');
      
      toast({ title: t('pixSuccessTitle'), description: t('pixSuccessDesc', { amount }) });
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast({ title: tc('error'), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setFile(e.target.files[0]);
      }
  };

  const submitProof = async () => {
      setLoading(true);
      // Simulate upload
      setTimeout(() => {
          setLoading(false);
          setTransferStep(3);
          // Send email logic would go here
      }, 2000);
  };

  if (!profile) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-white" /></div>;

  const showPix = profile.country === 'BR';
  const showSepa = ['LU', 'DE', 'FR', 'ES', 'PT', 'IT', 'NL', 'BE'].includes(profile.country) || profile.currency === 'EUR';

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header & Country Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t('title')}</h1>
            <p className="text-slate-400 max-w-xl">{t('subtitle')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end gap-4 w-full md:w-auto">
          <div className="w-full sm:w-[220px]">
            <Label className="text-xs text-slate-500 mb-1.5 block flex items-center gap-1">
              <Globe className="w-3 h-3" /> {t('countryOrigin')}
            </Label>
            <Select value={detectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 hover:bg-white/10 transition-colors focus:ring-cyan-500/50">
                <SelectValue placeholder={t('countryPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A20] border-white/10 text-white">
                <SelectItem value="BR">{t('countries.br')}</SelectItem>
                <SelectItem value="LU">{t('countries.lu')}</SelectItem>
                <SelectItem value="PT">{t('countries.pt')}</SelectItem>
                <SelectItem value="DE">{t('countries.de')}</SelectItem>
                <SelectItem value="FR">{t('countries.fr')}</SelectItem>
                <SelectItem value="US">{t('countries.us')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Methods Grid */}
      {!selectedMethod ? (
          <div className="flex overflow-x-auto snap-x md:grid md:grid-cols-2 gap-6 pb-4 md:pb-0 scrollbar-hide">
            {showPix && (
                <MethodCard 
                    className="min-w-[280px] snap-center"
                    icon={<QrCode className="w-10 h-10 text-cyan-400" />}
                    title={t('methods.pix.title')}
                    desc={t('methods.pix.description')}
                    time={t('methods.pix.time')}
                    onClick={() => setSelectedMethod('pix')}
                />
            )}
            {showSepa && (
                <MethodCard 
                    icon={<Landmark className="w-10 h-10 text-blue-400" />}
                    title={t('methods.sepaInstant.title')}
                    desc={t('methods.sepaInstant.description')}
                    time={t('methods.sepaInstant.time')}
                    onClick={() => setSelectedMethod('sepa')}
                />
            )}
            <MethodCard 
                icon={<Wallet className="w-10 h-10 text-purple-400" />}
                title={t('methods.crypto.title')}
                desc={t('methods.crypto.description')}
                time={t('methods.crypto.time')}
                onClick={() => setSelectedMethod('crypto')}
            />
            <MethodCard 
                icon={<Building className="w-10 h-10 text-emerald-400" />}
                title={t('methods.bank.title')}
                desc={t('methods.bank.description')}
                time={t('methods.bank.time')}
                onClick={() => setSelectedMethod('bank')}
            />
          </div>
      ) : (
          <div className="space-y-6">
              <Button variant="ghost" onClick={() => setSelectedMethod(null)} className="pl-0 text-slate-400 hover:text-white">
                  ← {t('backToMethods')}
              </Button>

              {/* PIX Content */}
              {selectedMethod === 'pix' && (
                  <div className="max-w-xl mx-auto">
                      <Card className="bg-[#111116] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <QrCode className="w-6 h-6 text-cyan-400" /> {t('pix.formTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePixDeposit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">{t('pixAmountLabel')}</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                                        <Input 
                                            type="number" 
                                            value={amount} 
                                            onChange={e => setAmount(e.target.value)} 
                                            className="pl-10 bg-black/20 border-white/10 text-white text-lg h-12" 
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={loading || !amount} className="w-full h-12 text-base font-bold bg-cyan-500 hover:bg-cyan-400 text-black">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('pix.copyPaste')}
                                </Button>
                            </form>
                        </CardContent>
                      </Card>
                  </div>
              )}

              {/* Bank Transfer Wizard */}
              {selectedMethod === 'bank' && (
                  <div className="max-w-2xl mx-auto">
                      <div className="mb-8 flex justify-between items-center relative">
                          {/* Background Line */}
                          <div className="absolute top-4 left-0 w-full h-0.5 bg-white/10 -z-10" />
                          {/* Progress Line */}
                          <div 
                            className="absolute top-4 left-0 h-0.5 bg-emerald-500 -z-10 transition-all duration-500" 
                            style={{ width: `${((transferStep - 1) / 2) * 100}%` }} 
                          />
                          
                          <Step number={1} title={t('bank.steps.details')} active={transferStep >= 1} />
                          <Step number={2} title={t('bank.steps.proof')} active={transferStep >= 2} />
                          <Step number={3} title={t('bank.steps.done')} active={transferStep >= 3} />
                      </div>

                      <Card className="bg-[#111116] border-white/10">
                          {transferStep === 1 && (
                              <div className="p-6 space-y-6">
                                  <div className="bg-white/5 p-6 rounded-xl space-y-4">
                                      <h3 className="text-lg font-medium text-white mb-4">{t('bank.transferDetailsTitle')}</h3>
                                      <DetailRow label={t('bank.labels.beneficiary')} value="Global Secure Send Ltd." />
                                      <DetailRow label={t('bank.labels.iban')} value="LU88 0000 0000 0000 0000" copy />
                                      <DetailRow label={t('bank.labels.bicSwift')} value="GSSLULLL" copy />
                                      <DetailRow label={t('bank.labels.bank')} value="BGL BNP Paribas" />
                                      <div className="pt-4 border-t border-white/10">
                                          <p className="text-sm text-amber-400 font-medium">{t('bank.referenceRequired')}</p>
                                          <p className="text-2xl font-mono text-white mt-1 select-all">DEPOSIT-{profile.country}-USER</p>
                                      </div>
                                  </div>
                                  <Button onClick={() => setTransferStep(2)} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                      {t('bank.doneTransfer')}
                                  </Button>
                              </div>
                          )}

                          {transferStep === 2 && (
                              <div className="p-6 space-y-6">
                                  <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors bg-white/5">
                                      <input type="file" id="proof" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                                      <label htmlFor="proof" className="cursor-pointer block">
                                          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                          <p className="text-white font-medium mb-2">{t('bank.uploadTitle')}</p>
                                          <p className="text-sm text-slate-500">{t('bank.uploadFormats')}</p>
                                      </label>
                                      {proofFile && (
                                          <div className="mt-4 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg inline-flex items-center gap-2">
                                              <CheckCircle className="w-4 h-4" /> {proofFile.name}
                                          </div>
                                      )}
                                  </div>
                                  <Button onClick={submitProof} disabled={!proofFile || loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('bank.uploadSubmit')}
                                  </Button>
                              </div>
                          )}

                          {transferStep === 3 && (
                              <div className="p-12 text-center space-y-6">
                                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                                  </div>
                                  <h3 className="text-2xl font-bold text-white">{t('bank.successTitle')}</h3>
                                  <p className="text-slate-400 max-w-md mx-auto">
                                      {t('bank.successDescription')}
                                  </p>
                                  <div className="bg-slate-900 p-4 rounded-lg inline-block text-left text-sm">
                                      <p className="text-slate-500">{t('bank.protocol')}</p>
                                      <p className="text-white font-mono">REQ-{Math.floor(Math.random()*10000)}</p>
                                  </div>
                                  <Button onClick={() => { setSelectedMethod(null); setTransferStep(1); }} variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                                      {t('bank.backHome')}
                                  </Button>
                              </div>
                          )}
                      </Card>
                  </div>
              )}

              {/* Crypto Content */}
              {selectedMethod === 'crypto' && (
                  <div className="max-w-xl mx-auto text-center">
                      <Card className="bg-[#111116] border-white/10">
                          <CardContent className="py-8">
                              <div className="bg-white p-4 inline-block rounded-xl mb-6">
                                  <div className="w-48 h-48 bg-slate-200" /> {/* QR Placeholder */}
                              </div>
                              <p className="text-slate-400 mb-2">{t('crypto.addressTitle')}</p>
                              <code className="bg-black/40 px-4 py-3 rounded-lg text-purple-400 font-mono block mb-6 break-all select-all border border-purple-500/20">
                                  0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                              </code>
                              <div className="flex gap-2 justify-center">
                                  <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                                      {t('crypto.copyAddress')}
                                  </Button>
                              </div>
                          </CardContent>
                      </Card>
                  </div>
              )}
          </div>
      )}

      {/* Instructions Accordion */}
      <div className="mt-12 pt-12 border-t border-white/10">
          <h2 className="text-xl font-bold text-white mb-6">{t('faq.title')}</h2>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border border-white/10 rounded-lg bg-[#111116] px-4">
              <AccordionTrigger className="text-slate-300 hover:text-white py-4">
                 <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold">1</span>
                    {t('faq.bankHowTo.title')}
                 </div>
              </AccordionTrigger>
              <AccordionContent className="text-slate-400 pt-2 pb-4 space-y-4">
                <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>{t('faq.bankHowTo.steps.1')}</li>
                    <li>{t('faq.bankHowTo.steps.2')}</li>
                    <li>{t('faq.bankHowTo.steps.3')}</li>
                    <li>{t('faq.bankHowTo.steps.4')}</li>
                    <li>{t('faq.bankHowTo.steps.5')}</li>
                    <li>{t('faq.bankHowTo.steps.6')}</li>
                </ol>
                <div className="bg-amber-950/20 text-amber-400 p-3 rounded text-sm border border-amber-500/20">
                    {t('faq.bankHowTo.deadline')}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-white/10 rounded-lg bg-[#111116] px-4">
              <AccordionTrigger className="text-slate-300 hover:text-white py-4">
                 <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold">2</span>
                    {t('faq.limitsFees.title')}
                 </div>
              </AccordionTrigger>
              <AccordionContent className="text-slate-400 pt-2 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/5 p-3 rounded">
                        <p className="text-xs text-slate-500 uppercase mb-1">{t('faq.limitsFees.minimumDeposit')}</p>
                        <p className="text-white font-mono">€ 10,00</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded">
                        <p className="text-xs text-slate-500 uppercase mb-1">{t('faq.limitsFees.maximumDeposit')}</p>
                        <p className="text-white font-mono">€ 10.000,00</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded">
                        <p className="text-xs text-slate-500 uppercase mb-1">{t('faq.limitsFees.sepaFee')}</p>
                        <p className="text-emerald-400 font-mono">{t('faq.limitsFees.free')}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded">
                        <p className="text-xs text-slate-500 uppercase mb-1">{t('faq.limitsFees.swiftFee')}</p>
                        <p className="text-white font-mono">€ 25,00</p>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="border border-white/10 rounded-lg bg-[#111116] px-4">
              <AccordionTrigger className="text-slate-300 hover:text-white py-4">
                 <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold">3</span>
                    {t('faq.settlement.title')}
                 </div>
              </AccordionTrigger>
              <AccordionContent className="text-slate-400 pt-2 pb-4">
                <ul className="space-y-2 text-sm">
                    <li className="flex justify-between">
                        <span>SEPA Instant</span>
                        <span className="text-white">{t('faq.settlement.instant')}</span>
                    </li>
                    <li className="flex justify-between">
                        <span>PIX (Brasil)</span>
                        <span className="text-white">{t('faq.settlement.instant')}</span>
                    </li>
                    <li className="flex justify-between">
                        <span>{t('faq.settlement.sepaTransfer')}</span>
                        <span className="text-white">{t('faq.settlement.oneBusinessDay')}</span>
                    </li>
                    <li className="flex justify-between">
                        <span>{t('faq.settlement.swiftInternational')}</span>
                        <span className="text-white">{t('faq.settlement.threeToFiveBusinessDays')}</span>
                    </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
      </div>
    </div>
  );
}

function MethodCard({ icon, title, desc, time, onClick, className }: any) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "group cursor-pointer bg-[#111116] border border-white/10 hover:border-cyan-500/50 p-6 rounded-xl transition-all hover:bg-white/[0.02] relative overflow-hidden flex-shrink-0",
                className
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/5 rounded-lg group-hover:bg-cyan-500/10 transition-colors">
                    {icon}
                </div>
                <span className="text-xs font-medium bg-white/5 text-slate-300 px-2 py-1 rounded-full border border-white/5">
                    {time}
                </span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{title}</h3>
            <p className="text-slate-400 text-sm">{desc}</p>
        </div>
    )
}

function Step({ number, title, active }: any) {
    return (
        <div className="flex flex-col items-center gap-2 relative z-10 bg-[#0A0A0F] px-2">
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                active ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110" : "bg-[#111116] border border-white/20 text-slate-500"
            )}>
                {active ? <CheckCircle className="w-5 h-5" /> : number}
            </div>
            <span className={cn("text-xs font-medium transition-colors", active ? "text-emerald-400" : "text-slate-600")}>{title}</span>
        </div>
    )
}

function DetailRow({ label, value, copy }: any) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-slate-400 text-sm">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-white font-mono text-sm">{value}</span>
                {copy && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white" onClick={() => navigator.clipboard.writeText(value)}>
                        <FileText className="w-3 h-3" />
                    </Button>
                )}
            </div>
        </div>
    )
}
