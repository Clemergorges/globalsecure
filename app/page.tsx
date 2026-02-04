import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, Shield, Zap, Lock, Smartphone, CreditCard, Menu, X } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-blue-100">
      {/* Header Minimalista */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all duration-300">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-slate-900">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Globe className="w-5 h-5" />
            </div>
            GlobalSecure
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</Link>
            <Link href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Business</Link>
            <Link href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Security</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Log in
            </Link>
            <Link href="/register">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 h-10 shadow-none font-medium transition-all hover:scale-105">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section Clean */}
        <section className="relative w-full pb-20 lg:pb-32 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center space-y-8 mb-16">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:border-slate-300 cursor-pointer">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                Now available in 50+ countries
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
                The modern way to <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">move money globally.</span>
              </h1>
              
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
                Send money internationally with real exchange rates and no hidden fees. 
                Trusted by millions for secure, instant transfers.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 rounded-full text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 w-full sm:w-auto">
                    Open Free Account
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-base border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 w-full sm:w-auto">
                  How it works
                </Button>
              </div>
            </div>

            {/* Abstract Hero Visual - Clean & Modern */}
            <div className="relative mx-auto max-w-4xl mt-12">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden p-2">
                <div className="bg-slate-50 rounded-xl overflow-hidden aspect-[16/9] relative flex items-center justify-center border border-slate-100">
                  {/* Mock UI Elements representing dashboard */}
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                  
                  {/* Floating Cards Mockup */}
                  <div className="relative z-10 w-full max-w-lg">
                     <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-6 transform hover:scale-105 transition-transform duration-500">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Balance</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">€24,500.00</h3>
                          </div>
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <Globe className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <ArrowRight className="w-4 h-4 rotate-45" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">Received from Apple Inc.</p>
                                <p className="text-xs text-slate-500">Today, 10:23 AM</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-green-600">+ $4,200.00</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <ArrowRight className="w-4 h-4 -rotate-45" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">Sent to Maria G.</p>
                                <p className="text-xs text-slate-500">Yesterday, 4:15 PM</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-900">- €150.00</span>
                          </div>
                        </div>
                     </div>
                  </div>

                  {/* Decorative blobs behind */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-200/30 to-purple-200/30 blur-3xl rounded-full -z-10"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof / Logos - Monochrome for cleaner look */}
        <section className="py-12 border-y border-slate-50 bg-slate-50/50">
          <div className="container mx-auto px-6">
            <p className="text-center text-sm font-medium text-slate-400 mb-8 uppercase tracking-widest">Trusted by leading companies worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Placeholder Company Logos using text for simplicity but styled to look like logos */}
              <span className="text-xl font-bold text-slate-800">ACME Corp</span>
              <span className="text-xl font-bold text-slate-800 italic font-serif">GlobalTech</span>
              <span className="text-xl font-bold text-slate-800 tracking-tighter">Stripe</span>
              <span className="text-xl font-bold text-slate-800 font-mono">Vercel</span>
              <span className="text-xl font-bold text-slate-800">Revolut</span>
            </div>
          </div>
        </section>

        {/* Features Grid - Minimalist */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                  Banking without <br/> the bank.
                </h2>
                <p className="text-lg text-slate-500 leading-relaxed mb-8">
                  Traditional banks charge hidden fees and take days to process transfers. 
                  We built a modern financial network that moves money instantly and transparently.
                </p>
                <ul className="space-y-4">
                  {[
                    "Real mid-market exchange rates",
                    "Instant transfers to 80+ countries",
                    "Multi-currency accounts (IBAN, ACH, SWIFT)",
                    "Virtual and physical debit cards"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative z-10">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                        <Zap className="w-8 h-8 text-amber-500 mb-4" />
                        <h3 className="font-bold text-slate-900">Instant</h3>
                        <p className="text-sm text-slate-500 mt-2">Under 20 seconds</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                        <Shield className="w-8 h-8 text-blue-500 mb-4" />
                        <h3 className="font-bold text-slate-900">Secure</h3>
                        <p className="text-sm text-slate-500 mt-2">Bank-grade encryption</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                        <Globe className="w-8 h-8 text-green-500 mb-4" />
                        <h3 className="font-bold text-slate-900">Global</h3>
                        <p className="text-sm text-slate-500 mt-2">150+ currencies</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                        <Smartphone className="w-8 h-8 text-purple-500 mb-4" />
                        <h3 className="font-bold text-slate-900">Mobile</h3>
                        <p className="text-sm text-slate-500 mt-2">iOS & Android</p>
                      </div>
                   </div>
                </div>
                <div className="absolute inset-0 bg-blue-600/5 transform translate-x-4 translate-y-4 rounded-3xl -z-10"></div>
              </div>
            </div>

            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Why choose GlobalSecure?</h2>
              <p className="text-slate-500">Everything you need to manage your money globally, in one place.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Lock,
                  title: "Unbreakable Security",
                  desc: "Your money is safeguarded in top-tier financial institutions. We use 2FA and biometric security."
                },
                {
                  icon: CreditCard,
                  title: "Virtual Cards",
                  desc: "Create disposable virtual cards for safe online shopping. Freeze and unfreeze instantly."
                },
                {
                  icon: Globe,
                  title: "No Hidden Fees",
                  desc: "We always show you the fee upfront and use the real exchange rate. No bad surprises."
                }
              ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
                  <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-blue-200 transition-all">
                    <feature.icon className="w-6 h-6 text-slate-700 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section Clean */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
          <div className="container mx-auto px-6 text-center relative z-10 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Start sending money smarter.
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
              Join 12 million+ people saving on international transfers. Open your free account in minutes.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white h-14 px-10 rounded-full text-lg font-medium shadow-lg shadow-blue-900/50 border-0">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 text-slate-600">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 font-bold text-xl text-slate-900 mb-4">
                <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                GlobalSecure
              </div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Making money borderless, transparent, and instant for everyone, everywhere.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Personal</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Business</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#" className="hover:text-blue-600 transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>© 2026 GlobalSecureSend. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-slate-600">Twitter</Link>
              <Link href="#" className="hover:text-slate-600">LinkedIn</Link>
              <Link href="#" className="hover:text-slate-600">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
