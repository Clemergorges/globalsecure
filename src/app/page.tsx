'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Globe2, 
  Zap, 
  ArrowRight, 
  Smartphone, 
  Lock, 
  CreditCard,
  ChevronRight,
  Activity, Wallet,
  Eye,
  EyeOff
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

// --- Components ---

const GridBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#05050A]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.4]" />
    <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-cyan-900/20 via-transparent to-transparent blur-3xl" />
  </div>
);

const GlowingBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="relative inline-flex group">
    <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
    <div className="relative inline-flex items-center justify-center px-4 py-1 text-sm font-medium text-white transition-all duration-200 bg-black font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 border border-white/10">
      {children}
    </div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="relative p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-cyan-500/50 transition-all duration-300 group overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/10 group-hover:border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <Icon className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3 font-sans tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Mock for the eye icon request

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#05050A] text-slate-200 selection:bg-cyan-500/30 font-sans overflow-x-hidden">
      <GridBackground />

      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#05050A]/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40"></div>
              <Logo className="w-8 h-8 relative z-10 text-cyan-400" showText={false} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">GlobalSecureSend</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors">Features</Link>
            <Link href="#security" className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors">Security</Link>
            <Link href="#business" className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors">Business</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5">Login</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full px-6 shadow-[0_0_20px_-5px_rgba(6,182,212,0.6)] transition-all hover:scale-105">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Hero Content */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10"
          >
            <GlowingBadge>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                <span className="tracking-wide uppercase text-[10px]">Future of Finance</span>
              </span>
            </GlowingBadge>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white mt-8 mb-6 leading-[1.1] tracking-tight">
              Borderles<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">s</span> Money <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">Instant Reality.</span>
            </h1>
            
            <p className="text-lg text-slate-400 mb-8 max-w-lg leading-relaxed border-l-2 border-cyan-500/50 pl-6 shadow-[inset_10px_0_20px_-10px_rgba(6,182,212,0.1)]">
              Move capital globally in seconds using stablecoin rails with local bank settlement. 
              <span className="text-cyan-400 font-medium"> Zero friction. Zero hidden fees.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-14 px-8 text-base bg-white text-black hover:bg-cyan-50 hover:scale-105 transition-all font-bold rounded-xl flex items-center gap-2 group shadow-[0_0_30px_-10px_rgba(255,255,255,0.3)]">
                  Open Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl backdrop-blur-sm">
                View Documentation
              </Button>
            </div>

            <div className="mt-12 flex items-center gap-6 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                Bank-Grade Security
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-500" />
                Polygon Network
              </div>
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-500" />
                180+ Countries
              </div>
            </div>
          </motion.div>

          {/* Hero Visual - Futuristic HUD */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center perspective-1000"
          >
            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />

            {/* Main Interface Card */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative w-full max-w-md bg-[#0A0A0F]/90 backdrop-blur-xl rounded-[2rem] border border-cyan-500/20 shadow-[0_0_50px_-20px_rgba(6,182,212,0.3)] overflow-hidden"
            >
              {/* Top Bar */}
              <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/5">
                  <Lock className="w-3 h-3 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">ENCRYPTED_256</span>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-8 space-y-8">
                {/* Total Balance */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Balance</div>
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-4xl font-bold text-white font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {showPassword ? '$124,500.00' : '•••••••••••'} <span className="text-slate-600 text-2xl">USDT</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/20">
                      <Activity className="w-3 h-3" /> +12.5%
                    </span>
                    <span className="text-slate-500 text-xs py-0.5">vs last month</span>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { icon: ArrowRight, label: 'Send', color: 'text-cyan-400', glow: 'shadow-cyan-500/50' },
                    { icon: CreditCard, label: 'Card', color: 'text-purple-400', glow: 'shadow-purple-500/50' },
                    { icon: Wallet, label: 'Top Up', color: 'text-pink-400', glow: 'shadow-pink-500/50' },
                    { icon: Globe2, label: 'Convert', color: 'text-yellow-400', glow: 'shadow-yellow-500/50' }
                  ].map((action, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                      <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all ${action.color} group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300 transition-colors">{action.label}</span>
                    </div>
                  ))}
                </div>

                {/* Recent Activity Mock */}
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Activity</div>
                  {[
                    { name: 'Stripe Issuing', time: '2 min ago', amount: '- $120.00', status: 'Pending' },
                    { name: 'USDT Deposit', time: '1 hour ago', amount: '+ $5,000.00', status: 'Completed' },
                    { name: 'Netflix', time: '5 hours ago', amount: '- $14.99', status: 'Completed' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-default border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.status === 'Completed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}`} />
                        <div>
                          <div className="text-sm font-medium text-white">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.time}</div>
                        </div>
                      </div>
                      <div className={`text-sm font-mono font-medium ${item.amount.startsWith('+') ? 'text-emerald-400' : 'text-white'}`}>
                        {item.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Elements (Decorations) */}
              <motion.div 
                animate={{ y: [0, 10, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 4, delay: 1 }}
                className="absolute -right-8 top-20 bg-black/80 backdrop-blur-xl p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_30px_-10px_rgba(6,182,212,0.4)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Globe2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Transfer Speed</div>
                    <div className="text-lg font-bold text-white font-mono drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">0.8s</div>
                  </div>
                </div>
              </motion.div>

            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Built for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">Speed of Light</span>
            </h2>
            <p className="text-slate-400 text-lg">
              Legacy banking was built for the 20th century. We built the financial stack for the AI era.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              delay={0.1}
              icon={Zap}
              title="Instant Settlement"
              description="Funds move on-chain via Polygon. No waiting 3-5 business days for SWIFT. Settlement happens in seconds, 24/7/365."
            />
            <FeatureCard 
              delay={0.2}
              icon={Lock}
              title="Military-Grade Security"
              description="Your assets are protected by MPC wallets and real-time fraud detection. We use Stripe Identity for biometric verification."
            />
            <FeatureCard 
              delay={0.3}
              icon={CreditCard}
              title="Virtual VISA Cards"
              description="Issue unlimited virtual cards for your team or software subscriptions. Spend your crypto balance anywhere VISA is accepted."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-cyan-900/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent opacity-50" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
            Ready to upgrade your money?
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Join thousands of digital nomads and global businesses saving hours and thousands in fees every month.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/register">
              <Button size="lg" className="h-16 px-10 text-lg bg-cyan-500 text-black hover:bg-cyan-400 font-bold rounded-full shadow-[0_0_40px_-10px_rgba(6,182,212,0.6)] hover:scale-105 transition-all">
                Start for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 text-slate-600" showText={false} />
            <span className="text-slate-600 font-semibold">GlobalSecureSend © 2026</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-600">
            <Link href="#" className="hover:text-cyan-400 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-cyan-400 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-cyan-400 transition-colors">Twitter</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}