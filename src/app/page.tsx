
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Globe, CreditCard, ArrowRight, Smartphone, Zap, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-blue-900">GlobalSecure</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-blue-600 transition-colors">Funcionalidades</Link>
            <Link href="#security" className="hover:text-blue-600 transition-colors">Segurança</Link>
            <Link href="#pricing" className="hover:text-blue-600 transition-colors">Taxas</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-semibold text-gray-700 hover:text-blue-600 hover:bg-blue-50">
                Entrar
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
                Abrir Conta Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 lg:pt-32 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
              <div className="flex-1 text-center lg:text-left space-y-8">
                <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800 font-medium mb-4">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                  Agora disponível na Europa e Brasil
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                  Banking Global <br className="hidden lg:block" />
                  <span className="text-blue-600">Sem Fronteiras.</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  A primeira conta digital híbrida que une a segurança bancária com a velocidade da blockchain. Receba, converta e gaste em qualquer lugar do mundo.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/auth/register">
                    <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all">
                      Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-12 px-8 border-gray-300 hover:bg-gray-50">
                      Saiba Mais
                    </Button>
                  </Link>
                </div>
                <div className="pt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Sem mensalidade</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cartão Virtual Grátis</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Suporte 24/7</span>
                </div>
              </div>
              <div className="flex-1 relative w-full max-w-[500px] lg:max-w-none">
                <div className="relative rounded-2xl bg-white p-2 shadow-2xl border border-gray-100 rotate-1 hover:rotate-0 transition-transform duration-500">
                   <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-60"></div>
                   <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-100 rounded-full blur-2xl opacity-60"></div>
                   <img 
                     src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1000" 
                     alt="GlobalSecure Dashboard Preview" 
                     className="rounded-xl w-full h-auto object-cover shadow-inner bg-gray-50 aspect-[4/3]"
                   />
                   
                   {/* Floating Cards */}
                   <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce duration-[3000ms]">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <Zap className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Transferência Recebida</p>
                        <p className="text-sm font-bold text-gray-900">+ € 1.250,00</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-4">
                Tudo o que você precisa em um só lugar
              </h2>
              <p className="text-lg text-gray-600">
                Simplificamos sua vida financeira com ferramentas poderosas para você e sua empresa.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Globe className="w-10 h-10 text-blue-600" />}
                title="Conta Global Multi-Moeda"
                description="Mantenha saldos em EUR, USD e USDT. Converta instantaneamente com as melhores taxas do mercado."
              />
              <FeatureCard 
                icon={<CreditCard className="w-10 h-10 text-purple-600" />}
                title="Cartões Virtuais Instantâneos"
                description="Crie cartões ilimitados para compras online seguras. Congele e descongele a qualquer momento pelo app."
              />
              <FeatureCard 
                icon={<Shield className="w-10 h-10 text-green-600" />}
                title="Segurança de Nível Bancário"
                description="Autenticação de dois fatores, criptografia de ponta a ponta e conformidade total com regulamentações europeias."
              />
              <FeatureCard 
                icon={<Zap className="w-10 h-10 text-yellow-500" />}
                title="Transferências em Segundos"
                description="Envie dinheiro para qualquer usuário GlobalSecure instantaneamente e sem taxas ocultas."
              />
              <FeatureCard 
                icon={<Smartphone className="w-10 h-10 text-gray-700" />}
                title="App Intuitivo"
                description="Controle total na palma da sua mão. Notificações em tempo real e extratos detalhados."
              />
              <FeatureCard 
                icon={<CheckCircle2 className="w-10 h-10 text-teal-500" />}
                title="KYC Automatizado"
                description="Abertura de conta rápida e segura com verificação de identidade em minutos, sem burocracia."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-blue-600">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para revolucionar suas finanças?
            </h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-10">
              Junte-se a milhares de usuários que já confiam na GlobalSecure para suas transações internacionais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold px-8 h-14 text-lg w-full sm:w-auto shadow-xl">
                  Criar Conta Gratuita
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo className="w-6 h-6 grayscale opacity-50" />
              <span className="font-semibold text-gray-500">GlobalSecure © 2026</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-500">
              <Link href="#" className="hover:text-gray-900">Termos de Uso</Link>
              <Link href="#" className="hover:text-gray-900">Privacidade</Link>
              <Link href="#" className="hover:text-gray-900">Compliance</Link>
              <Link href="#" className="hover:text-gray-900">Suporte</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow bg-white/50 hover:bg-white">
      <CardHeader>
        <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50">
          {icon}
        </div>
        <CardTitle className="text-xl font-bold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
