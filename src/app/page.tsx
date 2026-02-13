
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Globe, CreditCard, ArrowRight, Smartphone, Zap, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="font-bold text-xl tracking-tight text-slate-900">GlobalSecureSend</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <Link href="#features" className="hover:text-cyan-600 transition-colors">Funcionalidades</Link>
            <Link href="#security" className="hover:text-cyan-600 transition-colors">Segurança</Link>
            <Link href="#business" className="hover:text-cyan-600 transition-colors">Para Empresas</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hidden sm:block">
              <Button variant="ghost" className="font-semibold text-slate-700 hover:text-cyan-600 hover:bg-slate-50">
                Entrar
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 shadow-sm transition-all hover:shadow-md">
                Abrir Conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40 bg-white">
           {/* Abstract Background */}
           <div className="absolute inset-0 z-0">
              <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-50/50 rounded-full blur-3xl mix-blend-multiply opacity-70"></div>
              <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl mix-blend-multiply opacity-70"></div>
           </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              
              {/* Text Content */}
              <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 font-medium shadow-sm mb-6 hover:border-cyan-200 transition-colors cursor-default">
                  <span className="flex h-2 w-2 rounded-full bg-cyan-500 mr-2 animate-pulse"></span>
                  Nova era bancária na Europa e Brasil
                </div>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                  O futuro do seu <br className="hidden lg:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">dinheiro global.</span>
                </h1>
                
                <p className="text-xl text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Uma conta digital híbrida que une a segurança suíça com a velocidade da blockchain. Receba em EUR, converta para USDT e gaste globalmente.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                  <Link href="/auth/register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full h-14 px-8 text-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg hover:shadow-cyan-200/50 transition-all rounded-xl">
                      Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="#features" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full h-14 px-8 text-lg border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                      Como funciona
                    </Button>
                  </Link>
                </div>

                <div className="pt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-cyan-500" /> Regulado na UE</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-cyan-500" /> Proteção de fundos</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-cyan-500" /> Suporte Premium</span>
                </div>
              </div>

              {/* Graphic / Visual */}
              <div className="flex-1 relative w-full max-w-[500px] lg:max-w-[600px] perspective-1000">
                {/* Main Card */}
                <div className="relative z-20 bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-800 transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-all duration-700 ease-out group">
                  
                  {/* Glass Effect Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <Logo className="w-5 h-5" showText={false} />
                       </div>
                       <span className="text-white font-semibold tracking-wide">GlobalSecureSend</span>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center">
                       <div className="w-4 h-4 text-slate-400">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                       </div>
                    </div>
                  </div>

                  {/* Balance Section */}
                  <div className="space-y-2 mb-8">
                    <p className="text-slate-400 text-sm font-medium">Saldo Total</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-bold text-white tracking-tight">€ 24.500,00</h3>
                      <span className="text-emerald-400 text-sm font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">+2.4%</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      { icon: <ArrowRight className="rotate-[-45deg]" />, label: "Enviar" },
                      { icon: <ArrowRight className="rotate-[135deg]" />, label: "Receber" },
                      { icon: <CreditCard />, label: "Cartão" },
                      { icon: <Globe />, label: "Câmbio" },
                    ].map((action, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 group/btn cursor-pointer">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 group-hover/btn:bg-cyan-600 group-hover/btn:text-white transition-colors">
                          {React.cloneElement(action.icon as React.ReactElement<any>, { className: "w-5 h-5" })}
                        </div>
                        <span className="text-xs text-slate-400 group-hover/btn:text-slate-200">{action.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent Activity Mock */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 font-medium">Atividade Recente</span>
                      <span className="text-cyan-500 cursor-pointer hover:text-cyan-400">Ver tudo</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                             <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="w-6" />
                          </div>
                          <div>
                             <p className="text-white font-medium text-sm">Apple Store</p>
                             <p className="text-slate-500 text-xs">Hoje, 14:30</p>
                          </div>
                       </div>
                       <span className="text-white font-medium">- € 1.299,00</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between border border-slate-700/50">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                             <Zap className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-white font-medium text-sm">Recebido de Alice</p>
                             <p className="text-slate-500 text-xs">Ontem, 09:15</p>
                          </div>
                       </div>
                       <span className="text-emerald-400 font-medium">+ € 450,00</span>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -z-10 top-[-20px] right-[-20px] w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-[2rem] blur-xl"></div>
                </div>
                
                {/* Floating "Success" Toast Mock */}
                <div className="absolute top-[20%] -left-12 z-30 bg-white p-4 rounded-xl shadow-2xl border border-slate-100 flex items-center gap-3 animate-bounce duration-[4000ms] max-w-[200px]">
                   <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                     <CheckCircle2 className="w-6 h-6 text-green-600" />
                   </div>
                   <div>
                     <p className="text-xs text-slate-500 font-medium">Transferência</p>
                     <p className="text-sm font-bold text-slate-900">Concluída</p>
                   </div>
                </div>

                 {/* Floating "Security" Badge Mock */}
                 <div className="absolute bottom-[15%] -right-8 z-30 bg-slate-900 p-4 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-pulse duration-[5000ms]">
                   <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                     <Lock className="w-4 h-4 text-cyan-400" />
                   </div>
                   <div>
                     <p className="text-xs text-slate-400 font-medium">Proteção</p>
                     <p className="text-sm font-bold text-white">Ativa 24h</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid - Refined */}
        <section id="features" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
                Tecnologia financeira de ponta
              </h2>
              <p className="text-lg text-slate-600">
                Construído para nômades digitais, freelancers e empresas que exigem mais do seu dinheiro.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Globe className="w-8 h-8 text-cyan-600" />}
                title="Multi-Moeda Global"
                description="Mantenha saldos em EUR, USD e USDT. IBAN europeu dedicado para receber pagamentos como um local."
              />
              <FeatureCard 
                icon={<CreditCard className="w-8 h-8 text-indigo-600" />}
                title="Cartões Corporativos"
                description="Emita cartões virtuais e físicos ilimitados. Controle gastos, defina limites e congele instantaneamente."
              />
              <FeatureCard 
                icon={<Shield className="w-8 h-8 text-emerald-600" />}
                title="Segurança Máxima"
                description="Seus fundos protegidos por autenticação biométrica e criptografia militar. Monitoramento 24/7."
              />
              <FeatureCard 
                icon={<Zap className="w-8 h-8 text-amber-500" />}
                title="Liquidação Instantânea"
                description="Adeus SWIFT. Movimente fundos internacionalmente em segundos usando nossa rede blockchain proprietária."
              />
              <FeatureCard 
                icon={<Smartphone className="w-8 h-8 text-slate-700" />}
                title="Mobile First"
                description="Uma experiência de usuário obsessivamente polida. Tudo o que você precisa, a um toque de distância."
              />
              <FeatureCard 
                icon={<CheckCircle2 className="w-8 h-8 text-teal-500" />}
                title="Compliance Automático"
                description="KYC/KYB integrados em tempo real. Esteja sempre em conformidade sem perder tempo com papelada."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-slate-900 relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
              Sua liberdade financeira começa aqui.
            </h2>
            <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-12">
              Junte-se à revolução financeira. Abra sua conta GlobalSecureSend em menos de 5 minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-10 h-16 text-lg w-full sm:w-auto shadow-xl shadow-cyan-900/20 transition-all rounded-xl">
                  Criar Conta Gratuita
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
               <div className="flex items-center gap-3 mb-6">
                <Logo className="w-8 h-8" />
                <span className="font-bold text-xl text-slate-900">GlobalSecureSend</span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed">
                A plataforma financeira definitiva para a economia global moderna. Rápida, segura e sem fronteiras.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-6">Produto</h4>
              <ul className="space-y-4 text-slate-500">
                <li><Link href="#" className="hover:text-cyan-600 transition-colors">Conta Global</Link></li>
                <li><Link href="#" className="hover:text-cyan-600 transition-colors">Cartões</Link></li>
                <li><Link href="#" className="hover:text-cyan-600 transition-colors">Câmbio</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-6">Legal</h4>
              <ul className="space-y-4 text-slate-500">
                <li><Link href="#" className="hover:text-cyan-600 transition-colors">Termos de Uso</Link></li>
                <li><Link href="#" className="hover:text-cyan-600 transition-colors">Privacidade</Link></li>
                <li><Link href="#" className="hover:text-cyan-600 transition-colors">Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="text-slate-400 text-sm">© 2026 GlobalSecureSend. Todos os direitos reservados.</span>
            <div className="flex gap-6">
               {/* Social icons placeholders */}
               <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
               <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
               <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border border-slate-100 shadow-sm hover:shadow-xl hover:border-cyan-100 transition-all duration-300 bg-white group">
      <CardHeader>
        <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-cyan-50 transition-colors">
          {icon}
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
