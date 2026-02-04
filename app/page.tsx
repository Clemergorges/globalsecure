import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, Shield, Zap, Lock, Smartphone, CreditCard, Check, X, ChevronRight, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-glow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tighter text-white">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Globe className="w-5 h-5 text-white" />
            </div>
            GlobalSecure<span className="text-indigo-400">Send</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {['Funcionalidades', 'Business', 'Segurança', 'Ajuda'].map((item) => (
              <Link key={item} href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-all hover:scale-105">
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/register">
              <Button className="bg-white text-slate-950 hover:bg-slate-200 rounded-full px-6 h-10 font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section */}
        <section className="relative w-full pb-24 lg:pb-32 px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 backdrop-blur-md">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="tracking-wide">A revolução das remessas chegou</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                  Envie dinheiro para o mundo, <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">gaste no celular.</span>
                </h1>
                
                <p className="text-xl text-slate-400 max-w-xl leading-relaxed">
                  Crie cartões virtuais internacionais instantaneamente. Integre com Apple Pay e Google Pay. Sem taxas escondidas.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="/register">
                    <Button size="lg" className="h-14 px-8 rounded-full text-base bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-[0_0_30px_rgba(99,102,241,0.4)] w-full sm:w-auto transition-all hover:scale-105">
                      Abrir Conta Grátis <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-base border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 w-full sm:w-auto backdrop-blur-sm">
                    Como Funciona
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 pt-6">
                  <div className="flex items-center gap-2">
                     <Check className="w-4 h-4 text-emerald-500" /> Regulado na UE
                  </div>
                  <div className="flex items-center gap-2">
                     <Check className="w-4 h-4 text-emerald-500" /> Criptografia 256-bit
                  </div>
                </div>
              </div>

              {/* Visual Hero - Cartão no Celular */}
              <div className="relative flex justify-center animate-float">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 rounded-full blur-[80px]"></div>
                
                {/* Mockup Celular + Cartão */}
                <div className="relative w-[300px] md:w-[350px] aspect-[0.5] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden p-4 flex flex-col items-center">
                   {/* Notch */}
                   <div className="absolute top-0 w-40 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                   
                   {/* Screen Content */}
                   <div className="w-full h-full bg-slate-950 rounded-[2rem] overflow-hidden relative">
                      {/* Wallpaper Glow */}
                      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/50 to-transparent"></div>
                      
                      <div className="relative z-10 p-6 pt-12 text-center text-white">
                         <p className="text-sm text-slate-400 mb-1">Saldo Disponível</p>
                         <h2 className="text-4xl font-bold mb-8">€1.250,50</h2>
                         
                         {/* Virtual Card */}
                         <div className="w-full aspect-[1.58/1] bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-4 text-left shadow-lg relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="relative z-10 flex flex-col justify-between h-full">
                               <div className="flex justify-between">
                                  <span className="font-bold italic">VISA</span>
                                  <Globe className="w-4 h-4 text-white/50" />
                               </div>
                               <div>
                                  <div className="flex gap-2 mb-2 text-xs">
                                     <span className="bg-white/20 px-1.5 py-0.5 rounded">VIRTUAL</span>
                                  </div>
                                  <p className="font-mono tracking-widest text-sm">•••• 4242</p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="mt-8 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">A</div>
                                  <div className="text-left">
                                     <p className="text-sm font-bold">Apple Store</p>
                                     <p className="text-xs text-slate-400">Hoje, 14:30</p>
                                  </div>
                               </div>
                               <span className="font-bold">-€29,90</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">S</div>
                                  <div className="text-left">
                                     <p className="text-sm font-bold">Spotify</p>
                                     <p className="text-xs text-slate-400">Ontem</p>
                                  </div>
                               </div>
                               <span className="font-bold">-€9,99</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute top-1/3 -right-4 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center gap-3 animate-float" style={{ animationDelay: '1.5s' }}>
                   <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-white" />
                   </div>
                   <div className="text-xs text-white">
                      <p>Adicionado ao</p>
                      <p className="font-bold">Apple Wallet</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-slate-900/50 border-y border-white/5">
           <div className="container mx-auto px-6 max-w-7xl">
              <div className="text-center mb-16">
                 <h2 className="text-3xl font-bold text-white mb-4">Simples. Rápido. Global.</h2>
                 <p className="text-slate-400">Três passos para gastar em qualquer lugar do mundo.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-12 relative">
                 {/* Connecting Line (Desktop) */}
                 <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent border-t border-dashed border-white/20 z-0"></div>
                 
                 {[
                    { title: "1. Envie Dinheiro", desc: "Transfira via PIX ou TED para sua conta GlobalSecure.", icon: ArrowRight, color: "text-indigo-400" },
                    { title: "2. Gere o Cartão", desc: "Crie um cartão virtual único ou recorrente instantaneamente.", icon: CreditCard, color: "text-cyan-400" },
                    { title: "3. Gaste no Mundo", desc: "Adicione ao Apple/Google Pay e use em 200+ países.", icon: Smartphone, color: "text-emerald-400" }
                 ].map((step, i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center text-center">
                       <div className="w-24 h-24 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center mb-6 shadow-xl relative group hover:scale-110 transition-transform duration-300">
                          <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <step.icon className={`w-10 h-10 ${step.color}`} />
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-800 rounded-full border border-white/10 flex items-center justify-center font-bold text-white shadow">
                             {i + 1}
                          </div>
                       </div>
                       <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                       <p className="text-slate-400 max-w-xs">{step.desc}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Why Us Cards */}
        <section className="py-24">
           <div className="container mx-auto px-6 max-w-7xl">
              <div className="text-center mb-16">
                 <h2 className="text-3xl font-bold text-white mb-4">Por que escolher GlobalSecure?</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                    { title: "Cartão Virtual", desc: "Segurança total com números que mudam a cada compra se desejar.", icon: Lock },
                    { title: "Zero IOF", desc: "Economize 6.38% em cada compra internacional vs cartões tradicionais.", icon: Zap },
                    { title: "Instantâneo", desc: "Sem espera de dias úteis. O dinheiro chega em segundos.", icon: Check },
                    { title: "Seguro", desc: "Seus dados nunca são expostos aos comerciantes.", icon: Shield }
                 ].map((card, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1">
                       <card.icon className="w-8 h-8 text-indigo-400 mb-4" />
                       <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                       <p className="text-sm text-slate-400">{card.desc}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Cost Comparison Table */}
        <section className="py-24 bg-slate-900/30">
           <div className="container mx-auto px-6 max-w-4xl">
              <div className="text-center mb-12">
                 <h2 className="text-3xl font-bold text-white mb-4">Pare de perder dinheiro</h2>
                 <p className="text-slate-400">Veja quanto você economiza enviando €1.000</p>
              </div>

              <div className="bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                 <div className="grid grid-cols-3 p-6 border-b border-white/10 bg-white/5 font-bold text-white">
                    <div>Provedor</div>
                    <div className="text-center">Taxa Total</div>
                    <div className="text-right">Você Recebe</div>
                 </div>
                 
                 {[
                    { name: "Bancos Tradicionais", fee: "4.5% + Spread", receive: "€955.00", isBest: false },
                    { name: "Wise / Revolut", fee: "~1.8%", receive: "€982.00", isBest: false },
                    { name: "GlobalSecureSend", fee: "0.8%", receive: "€992.00", isBest: true }
                 ].map((row, i) => (
                    <div key={i} className={`grid grid-cols-3 p-6 border-b border-white/5 items-center ${row.isBest ? 'bg-indigo-900/20' : ''}`}>
                       <div className="font-medium text-white flex items-center gap-2">
                          {row.isBest && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                          {row.name}
                       </div>
                       <div className="text-center text-slate-400">{row.fee}</div>
                       <div className={`text-right font-bold ${row.isBest ? 'text-emerald-400 text-xl' : 'text-slate-300'}`}>
                          {row.receive}
                       </div>
                    </div>
                 ))}
              </div>
              <p className="text-center text-xs text-slate-500 mt-6">*Valores estimados com base na cotação comercial do dia.</p>
           </div>
        </section>

        {/* Security Badges */}
        <section className="py-20 border-t border-white/5">
           <div className="container mx-auto px-6 text-center">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-10">Segurança de nível bancário</p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                 {/* Badges simulated with text/icons for now */}
                 <div className="flex items-center gap-2 text-white font-bold text-xl"><Shield className="w-6 h-6" /> GDPR Compliant</div>
                 <div className="flex items-center gap-2 text-white font-bold text-xl"><Lock className="w-6 h-6" /> TLS 1.3 Encryption</div>
                 <div className="flex items-center gap-2 text-white font-bold text-xl"><Check className="w-6 h-6" /> PCI DSS Level 1</div>
              </div>
           </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/20"></div>
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tighter">
              Abra sua conta em <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">2 minutos.</span>
            </h2>
            <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto">
              Junte-se a milhares de brasileiros economizando em remessas internacionais.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-16 px-12 rounded-full text-lg font-bold bg-white text-slate-950 hover:bg-indigo-50 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Começar Agora
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 bg-slate-950 text-slate-400">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-white">
              <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              GlobalSecureSend
            </div>
            <div className="flex gap-8 text-sm font-medium">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Termos</Link>
              <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-white transition-colors">Instagram</Link>
            </div>
            <p className="text-xs text-slate-600">© 2026 GlobalSecure Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
