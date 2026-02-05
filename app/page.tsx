import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, Shield, Zap, Check, Smartphone, CreditCard, Star } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900 overflow-x-hidden selection:bg-cyan-100 selection:text-cyan-900 font-sans">
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          
          <nav className="hidden md:flex items-center gap-8">
            {['Funcionalidades', 'Para Empresas', 'Preços', 'Ajuda'].map((item) => (
              <Link key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-[var(--color-primary)] transition-colors">
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Entrar
            </Link>
            <Link href="/register">
              <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg px-5 h-10 font-semibold transition-all shadow-sm">
                Criar conta grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section */}
        <section className="relative w-full pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  Global Banking • Luxembourg Based
                </div>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                  A fronteira entre moedas desapareceu.
                </h1>
                
                <p className="text-xl text-gray-500 max-w-lg leading-relaxed">
                  Contas multi-moeda com IBAN europeu. Envie, gaste e receba como um local em qualquer lugar do mundo.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="/register">
                    <Button size="lg" className="h-14 px-8 rounded-xl text-base bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-lg shadow-cyan-500/20 w-full sm:w-auto font-semibold">
                      Começar agora
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="h-14 px-8 rounded-xl text-base border-gray-200 text-gray-700 hover:bg-gray-50 w-full sm:w-auto font-medium">
                    Ver como funciona
                  </Button>
                </div>

                <div className="flex items-center gap-6 pt-6 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2">
                     <Check className="w-5 h-5 text-emerald-500" /> Em conformidade com PSD2 (EU)
                  </div>
                  <div className="flex items-center gap-2">
                     <Shield className="w-5 h-5 text-gray-400" /> Proteção de Dados GDPR
                  </div>
                </div>
              </div>

              {/* Visual Hero */}
              <div className="relative flex justify-center lg:justify-end">
                 <div className="relative w-[320px] h-[640px] bg-gray-900 rounded-[3rem] shadow-2xl border-[8px] border-gray-900 overflow-hidden ring-1 ring-gray-900/5">
                    {/* Screen Content */}
                    <div className="absolute inset-0 bg-white">
                       <div className="bg-[var(--color-primary)] h-1/3 w-full p-6 text-white flex flex-col justify-end pb-8">
                          <p className="text-cyan-100 text-sm mb-1">Saldo Total</p>
                          <h2 className="text-4xl font-bold">€1.250,50</h2>
                       </div>
                       <div className="p-6 -mt-6">
                          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
                             <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-gray-900">Cartão Virtual</span>
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">ATIVO</span>
                             </div>
                             <div className="h-32 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white flex flex-col justify-between shadow-md">
                                <div className="flex justify-between">
                                   <span className="italic font-bold text-lg">VISA</span>
                                   <Globe className="w-4 h-4 opacity-50" />
                                </div>
                                <div className="font-mono text-lg tracking-widest">•••• 4242</div>
                             </div>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 mb-4">Hoje</h3>
                          <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">🍎</div>
                                   <div>
                                      <p className="font-semibold text-gray-900">Apple Store</p>
                                      <p className="text-xs text-gray-500">Serviços</p>
                                   </div>
                                </div>
                                <span className="font-bold text-gray-900">-€29,90</span>
                             </div>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">☕</div>
                                   <div>
                                      <p className="font-semibold text-gray-900">Starbucks</p>
                                      <p className="text-xs text-gray-500">Alimentação</p>
                                   </div>
                                </div>
                                <span className="font-bold text-gray-900">-€4,50</span>
                             </div>
                          </div>
                       </div>
                    </div>
                    {/* Floating Elements */}
                    <div className="absolute top-1/2 -left-12 bg-white p-4 rounded-xl shadow-xl border border-gray-100 animate-bounce delay-700">
                       <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-full text-green-600"><Check className="w-4 h-4" /></div>
                          <div>
                             <p className="text-xs text-gray-500">Transferência</p>
                             <p className="font-bold text-gray-900 text-sm">Enviado com sucesso</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50">
           <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center mb-16">
                 <h2 className="text-3xl font-bold text-gray-900 mb-4">Tudo o que você precisa.</h2>
                 <p className="text-gray-500 max-w-2xl mx-auto">
                    Uma conta global completa para gerenciar sua vida financeira internacional.
                 </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                 {[
                    { title: "Cartões Virtuais", desc: "Gere cartões ilimitados para compras online seguras.", icon: CreditCard },
                    { title: "Câmbio Real", desc: "Converta moedas com a taxa comercial real, sem spread abusivo.", icon: Zap },
                    { title: "Apple & Google Pay", desc: "Adicione seus cartões à carteira do celular em segundos.", icon: Smartphone }
                 ].map((feature, i) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                       <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-[var(--color-primary)] mb-6">
                          <feature.icon className="w-6 h-6" />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                       <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gray-900 text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
              Pronto para economizar?
            </h2>
            <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto">
              Junte-se a mais de 10 milhões de pessoas que já usam GlobalSecure.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-16 px-10 rounded-xl text-lg font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white border-none shadow-xl shadow-cyan-900/50">
                Criar conta gratuita
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-100 py-12 text-gray-500">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <Logo showText={true} className="w-6 h-6" textClassName="text-base" />
            <div className="flex gap-8 text-sm">
              <Link href="/privacy" className="hover:text-[var(--color-primary)] transition-colors">Privacidade</Link>
              <Link href="/terms" className="hover:text-[var(--color-primary)] transition-colors">Termos</Link>
              <Link href="#" className="hover:text-[var(--color-primary)] transition-colors">Twitter</Link>
            </div>
            <p className="text-xs">© 2026 GlobalSecure Inc.</p>
        </div>
      </footer>
    </div>
  );
}
