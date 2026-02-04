import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, Shield, Zap, CheckCircle2, Lock, Smartphone, CreditCard } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="px-6 h-20 flex items-center border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-primary">
            <Globe className="w-8 h-8" />
            GlobalSecure<span className="text-foreground">Send</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Personal</Link>
            <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Business</Link>
            <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
            <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Help</Link>
          </nav>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-medium flex items-center hover:text-primary transition-colors">
              Log in
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 -z-10" />
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              
              {/* Left Column: Text */}
              <div className="space-y-8 animate-fade-in-up">
                <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                  New: Instant Transfers to Brazil 🇧🇷
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-slate-900 dark:text-white">
                  Money without <br />
                  <span className="text-primary">borders.</span>
                </h1>
                <p className="max-w-[600px] text-lg text-slate-600 dark:text-slate-400 md:text-xl leading-relaxed">
                  The fast, fair, and secure way to send money internationally. 
                  Hold 50+ currencies, spend with a virtual card, and send at the real exchange rate.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/register">
                    <Button size="lg" className="h-12 px-8 text-base bg-primary hover:bg-primary/90 w-full sm:w-auto shadow-xl shadow-primary/20">
                      Open Free Account <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base w-full sm:w-auto border-slate-300 dark:border-slate-700">
                    See How It Works
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Regulated in EU</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>12M+ Users</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Calculator/Visual */}
              <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none">
                <div className="relative rounded-2xl border border-slate-200 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="rounded-xl bg-white p-6 dark:bg-slate-900 shadow-sm">
                    {/* Mock Calculator Interface */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">You send</label>
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">1,000.00</span>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700">
                            <img src="https://flagcdn.com/w20/eu.png" alt="EUR" className="w-5 h-5 rounded-full" />
                            <span className="font-semibold">EUR</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative py-2">
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                        <div className="relative z-10 space-y-3 pl-12">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                              1.84 EUR fee
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                              1.0842 Exchange Rate
                            </span>
                            <span className="text-green-600 font-medium">Guaranteed rate (24h)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500">Recipient gets</label>
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">1,082.38</span>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700">
                            <img src="https://flagcdn.com/w20/us.png" alt="USD" className="w-5 h-5 rounded-full" />
                            <span className="font-semibold">USD</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <div className="flex justify-between text-sm text-slate-500 mb-2">
                          <span>Should arrive</span>
                          <span className="font-medium text-slate-900 dark:text-white">in seconds</span>
                        </div>
                        <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white h-12 font-bold shadow-lg shadow-primary/25">
                          Get Started
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -z-10"></div>
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-green-400/20 rounded-full blur-3xl -z-10"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full py-20 bg-slate-50 dark:bg-slate-900/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-slate-900 dark:text-white">
                Everything you need to send money globally
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                We built GlobalSecureSend to be the most reliable, transparent, and secure way to move money around the world.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Zap,
                  title: "Instant Transfers",
                  desc: "Recipients get access to funds immediately via virtual cards or instant account deposit networks.",
                  color: "text-amber-500",
                  bg: "bg-amber-500/10"
                },
                {
                  icon: Shield,
                  title: "Bank-Grade Security",
                  desc: "Fully regulated in Luxembourg. End-to-end encryption, 2FA protection, and biometric verification.",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10"
                },
                {
                  icon: Globe,
                  title: "Real Exchange Rates",
                  desc: "We use the mid-market rate—the one you see on Google. No hidden markups, ever.",
                  color: "text-green-500",
                  bg: "bg-green-500/10"
                },
                {
                  icon: CreditCard,
                  title: "Virtual Cards",
                  desc: "Create disposable or permanent virtual cards for safe online spending instantly.",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10"
                },
                {
                  icon: Lock,
                  title: "Data Privacy",
                  desc: "Your data is yours. We strictly adhere to GDPR and never sell your financial information.",
                  color: "text-red-500",
                  bg: "bg-red-500/10"
                },
                {
                  icon: Smartphone,
                  title: "Mobile First",
                  desc: "Manage everything from our top-rated mobile app. Notifications, freezing cards, and sending money.",
                  color: "text-indigo-500",
                  bg: "bg-indigo-500/10"
                }
              ].map((feature, i) => (
                <div key={i} className="group relative bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-24 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
          <div className="container px-4 md:px-6 mx-auto relative z-10 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white mb-6">
              Ready to start sending?
            </h2>
            <p className="mx-auto max-w-[600px] text-blue-100 text-lg/relaxed md:text-xl/relaxed mb-10">
              Join over 12 million people who get the real exchange rate with GlobalSecureSend.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg bg-white text-primary hover:bg-blue-50 border-none shadow-xl">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg border-blue-400 text-blue-50 hover:bg-blue-800 hover:text-white bg-transparent">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Press</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Use</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">GDPR</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Social</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Twitter</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">LinkedIn</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Facebook</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Instagram</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <span className="font-bold text-white">GlobalSecureSend</span>
            </div>
            <p className="text-xs text-center md:text-right">
              © 2026 GlobalSecureSend SA. All rights reserved. <br/>
              Authorized Electronic Money Institution regulated by the CSSF in Luxembourg.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
