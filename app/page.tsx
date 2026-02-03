import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-6 h-16 flex items-center border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-primary">
          <Globe className="w-6 h-6" />
          GlobalSecureSend
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4">
            Login
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-40 bg-gradient-to-br from-background via-slate-900 to-slate-800">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                  Global Money Transfers in Seconds
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
                  Send money internationally with instant virtual cards or direct account transfers. 
                  Average 1.8% fee. No hidden costs.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    Start Sending <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">Log In</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-slate-950/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-blue-500/10 rounded-full">
                  <Zap className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold">Instant Transfers</h2>
                <p className="text-gray-400">
                  Recipients get access to funds immediately via virtual cards or instant account deposit.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-purple-500/10 rounded-full">
                  <Shield className="w-8 h-8 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold">Bank-Grade Security</h2>
                <p className="text-gray-400">
                  Fully regulated in Luxembourg. End-to-end encryption and 2FA protection for every transaction.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-green-500/10 rounded-full">
                  <Globe className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold">Global Reach</h2>
                <p className="text-gray-400">
                  Send from EUR, USD, BRL to over 170 countries. Real exchange rates, always.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-border/40">
        <p className="text-xs text-gray-500">© 2026 GlobalSecureSend. All rights reserved. Luxembourg HQ.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
