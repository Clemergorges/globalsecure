
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, History, Wallet, TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  let wallet = await prisma.wallet.findUnique({
    where: { userId: session.userId },
    include: {
      balances: true,
      transactions: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!wallet) {
    try {
      console.log(`Wallet missing for user ${session.userId}. Attempting to create one.`);
      wallet = await prisma.wallet.create({
        data: {
          userId: session.userId,
          primaryCurrency: 'EUR',
          balances: {
            create: { currency: 'EUR', amount: 0 }
          }
        },
        include: {
          balances: true,
          transactions: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('Failed to auto-create wallet:', error);
      return (
        <div className="p-8">
          <Card className="bg-red-950/20 border-red-500/50">
            <CardContent className="p-6">
              <h2 className="text-red-400 font-bold text-lg">Carteira não encontrada</h2>
              <p className="text-red-300/80">Ocorreu um erro ao carregar sua carteira. Por favor, contate o suporte.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  const eurBalance = wallet.balances.find(b => b.currency === 'EUR')?.amount.toNumber() || 0;
  const usdtBalance = wallet.balances.find(b => b.currency === 'USDT')?.amount.toNumber() || 0;

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          <p className="text-slate-400">{t('welcome')}, {session.email}</p>
        </div>
        <div className="flex gap-3">
           <Link href="/dashboard/wallet/deposit">
             <Button className="gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] border-none">
               <ArrowDownLeft className="w-4 h-4" /> {t('deposit')}
             </Button>
           </Link>
           <Link href="/dashboard/transfers/create">
             <Button variant="outline" className="gap-2 border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
               <ArrowUpRight className="w-4 h-4" /> {t('transfer')}
             </Button>
           </Link>
        </div>
      </div>

      {/* Balances */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* EUR Card */}
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-400">{t('totalBalance')}</CardTitle>
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <span className="font-bold">€</span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-white tracking-tight">
              {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(eurBalance)}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">+2.5%</span> {t('thisMonth')}
            </p>
          </CardContent>
        </Card>
        
        {/* USDT Card */}
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-slate-400">{t('cryptoBalance')}</CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
              <span className="font-bold">$</span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-white tracking-tight">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdtBalance)}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Wallet className="w-3 h-3 text-purple-400" />
              {t('polygonNetwork')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-semibold tracking-tight text-white">{t('recentTransactions')}</h2>
           <Link href="/dashboard/transactions" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors">
             {t('viewFullStatement')} <History className="w-4 h-4" />
           </Link>
        </div>
        
        <Card className="bg-[#111116] border-white/5 backdrop-blur-sm overflow-hidden">
           <CardContent className="p-0">
             {wallet.transactions.length === 0 ? (
               <div className="p-12 text-center">
                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                   <History className="w-6 h-6 text-slate-500" />
                 </div>
                 <h3 className="text-white font-medium mb-1">{t('noRecentTransactions')}</h3>
                 <p className="text-slate-500 text-sm">{t('activitiesAppearHere')}</p>
               </div>
             ) : (
               <div className="divide-y divide-white/5">
                 {wallet.transactions.map((tx) => (
                   <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group">
                     <div className="flex flex-col gap-1">
                       <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{tx.description}</span>
                       <span className="text-xs text-slate-500">
                         {new Date(tx.createdAt).toLocaleDateString('pt-PT', {
                           day: '2-digit',
                           month: 'long',
                           year: 'numeric',
                           hour: '2-digit',
                           minute: '2-digit'
                         })}
                       </span>
                     </div>
                     <div className={`font-bold font-mono ${['CREDIT', 'DEPOSIT'].includes(tx.type) ? 'text-emerald-400' : 'text-slate-300'}`}>
                       {['CREDIT', 'DEPOSIT'].includes(tx.type) ? '+' : '-'}
                       {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: tx.currency }).format(tx.amount.toNumber())}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
