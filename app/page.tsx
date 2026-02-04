import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, Shield, Zap, Lock, Smartphone, CreditCard, Menu, X, Rocket, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-glow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Header Neo-Modern */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tighter text-white">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl blur opacity-75"></div>
              <div className="relative w-full h-full bg-slate-900 rounded-xl border border-white/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            GlobalSecure<span className="text-indigo-400">.io</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'Business', 'Crypto', 'Security'].map((item) => (
              <Link key={item} href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-all duration-300">
                {item}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/register">
              <Button className="bg-white text-slate-950 hover:bg-slate-200 rounded-full px-6 h-10 font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section Cyber-Punk Style */}
        <section className="relative w-full pb-24 lg:pb-32 px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              <div className="space-y-8 relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-indigo-300 backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="tracking-wide">THE FUTURE OF FINANCE IS HERE</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                  Money without <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">borders.</span>
                </h1>
                
                <p className="text-xl text-slate-400 max-w-xl leading-relaxed">
                  Experience the next generation of global payments. Instant transfers, crypto-friendly, and zero hidden fees.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="/register">
                    <Button size="lg" className="h-14 px-8 rounded-full text-base bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-[0_0_30px_rgba(124,58,237,0.4)] w-full sm:w-auto transition-all hover:scale-105">
                      Open Account <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-base border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 w-full sm:w-auto backdrop-blur-sm">
                    Explore Features
                  </Button>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-500 pt-8">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-xs text-white">
                        U{i}
                      </div>
                    ))}
                  </div>
                  <p>Trusted by <span className="text-white font-bold">12M+</span> visionaries</p>
                </div>
              </div>

              {/* 3D/Abstract Visual */}
              <div className="relative lg:h-[600px] flex items-center justify-center animate-float">
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-cyan-500/20 rounded-full blur-[80px]"></div>
                
                {/* Main Card */}
                <div className="relative w-full max-w-md aspect-[0.6] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] -z-10"></div>
                  
                  <div className="flex justify-between items-center mb-12">
                    <div className="text-xs font-mono text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded">VIRTUAL DEBIT</div>
                    <Globe className="w-6 h-6 text-white opacity-50" />
                  </div>

                  <div className="space-y-2 mb-12">
                    <h3 className="text-4xl font-mono text-white tracking-widest">€24,500<span className="text-slate-500 text-2xl">.00</span></h3>
                    <p className="text-emerald-400 text-sm flex items-center gap-1">
                      <Zap className="w-3 h-3" /> +12.5% this week
                    </p>
                  </div>

                  {/* Glass List */}
                  <div className="space-y-3">
                    {[
                      { name: "Netflix Subscription", amount: "-€14.99", time: "2m ago", icon: Zap },
                      { name: "Received from Apple", amount: "+$2,400.00", time: "1h ago", icon: ArrowRight },
                      { name: "Spotify Premium", amount: "-€9.99", time: "5h ago", icon: Zap },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <item.icon className="w-4 h-4 text-indigo-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.time}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-mono ${item.amount.startsWith('+') ? 'text-emerald-400' : 'text-white'}`}>
                          {item.amount}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -right-12 top-1/4 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl animate-float" style={{ animationDelay: '1s' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-white">Transfer Complete</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Architecture for the <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">New Economy</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                We've rebuilt the financial stack from the ground up. 
                Faster, safer, and infinitely more powerful.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
              
              {/* Feature 1 - Large */}
              <div className="md:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group border-glow hover:bg-white/10 transition-all duration-500">
                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                  <Globe className="w-48 h-48 text-indigo-500" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30">
                    <Globe className="w-6 h-6 text-indigo-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Global Network</h3>
                  <p className="text-slate-400 max-w-md">Send money to 160+ countries instantly via our proprietary mesh network. No intermediaries, no delays.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30">
                    <Shield className="w-6 h-6 text-emerald-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Vault Security</h3>
                  <p className="text-slate-400 text-sm">Military-grade encryption and biometric authentication for every transaction.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center mb-4 border border-rose-500/30">
                    <CreditCard className="w-6 h-6 text-rose-300" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Virtual Cards</h3>
                  <p className="text-slate-400 text-sm">Generate disposable cards for safe online shopping. Freeze instantly.</p>
                </div>
              </div>

              {/* Feature 4 - Large */}
              <div className="md:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:bg-white/10 transition-all duration-500">
                 <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="relative z-10 h-full flex flex-col justify-end">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4 border border-violet-500/30">
                    <Smartphone className="w-6 h-6 text-violet-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Mobile Command Center</h3>
                  <p className="text-slate-400 max-w-md">Control your entire financial life from a single, beautifully designed interface.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/20"></div>
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl md:text-8xl font-bold text-white mb-8 tracking-tighter">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Launch?</span>
            </h2>
            <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto">
              Join the financial revolution today. No paperwork, no waiting.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-16 px-12 rounded-full text-lg font-bold bg-white text-slate-950 hover:bg-indigo-50 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Start Your Journey
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
              GlobalSecure
            </div>
            <div className="flex gap-8 text-sm font-medium">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-white transition-colors">Discord</Link>
            </div>
            <p className="text-xs text-slate-600">© 2026 GlobalSecure Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
