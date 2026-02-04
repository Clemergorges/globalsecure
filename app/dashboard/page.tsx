import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Plus, ArrowRight, History, Globe, MoreHorizontal, CreditCard, Send, Activity, Wallet, Bell } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';

async function getData() {
  const session = await getSession();
  if (!session) return null;

  // @ts-ignore
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: session.userId },
    include: { wallet: true }
  });

  const recentTransfers = await prisma.transfer.findMany({
    where: {
      OR: [
        // @ts-ignore
        { senderId: session.userId },
        // @ts-ignore
        { recipientId: session.userId }
      ]
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  // @ts-ignore
  return { user, recentTransfers, userId: session.userId };
}

export default async function DashboardPage() {
  const data = await getData();

  if (!data || !data.user) {
    return <div className="p-8 text-center text-slate-500">Please log in to view your dashboard.</div>;
  }

  const wallet = data.user.wallet;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pt-6 px-4 md:px-8 pb-20">
      
      {/* Top Bar / Command Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
            Command Center
          </h2>
          <p className="text-slate-400 mt-1 pl-5">
            Welcome back, <span className="text-indigo-300 font-medium">{data.user.firstName}</span>. System active.
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto items-center">
          <div className="hidden md:flex items-center gap-4 mr-4">
             <div className="relative">
               <Bell className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer transition-colors" />
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
             </div>
             <div className="h-8 w-[1px] bg-white/10"></div>
          </div>
          
          <Button variant="outline" className="gap-2 flex-1 md:flex-none border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white hover:border-white/20 backdrop-blur-md">
            <Plus className="w-4 h-4" /> Deposit
          </Button>
          <Link href="/dashboard/send" className="flex-1 md:flex-none">
            <Button className="gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-500/50">
              <Send className="w-4 h-4" /> Transfer
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Left Column: Main Stats & Activity */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Balance Card - Cyber Style */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-8 group">
             {/* Animated Background Glow */}
             <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-500/30 transition-all duration-1000"></div>
             
             <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                <div className="space-y-6">
                   <div>
                      <p className="text-sm font-mono text-indigo-300 mb-1 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> TOTAL LIQUIDITY
                      </p>
                      <h3 className="text-5xl md:text-6xl font-bold text-white tracking-tight font-sans">
                        {formatCurrency(Number(wallet?.balanceEUR || 0), 'EUR').replace('€', '')}
                        <span className="text-2xl text-slate-500 font-normal ml-2">EUR</span>
                      </h3>
                   </div>
                   
                   <div className="flex gap-4">
                      <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> +2.4% (24H)
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-mono">
                        ID: {data.userId.substring(0, 8)}...
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                   <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-xs text-slate-400 font-mono">USD BALANCE</span>
                         <img src="https://flagcdn.com/w20/us.png" alt="USD" className="w-4 h-3 opacity-70" />
                      </div>
                      <p className="text-xl font-bold text-white font-mono">
                        {formatCurrency(Number(wallet?.balanceUSD || 0), 'USD')}
                      </p>
                   </div>
                </div>
             </div>
          </section>

          {/* Recent Activity - Terminal Style */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest font-mono">
                // SYSTEM LOGS
              </h3>
              <Link href="/dashboard/activity" className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                VIEW_ALL <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
              {data.recentTransfers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600 border border-white/5">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="text-slate-300 font-mono text-sm">NO_DATA_FOUND</h3>
                  <p className="text-slate-600 text-xs mt-1 font-mono">Initiate a transfer to generate logs.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                {data.recentTransfers.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                        t.senderId === data.userId 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {t.senderId === data.userId ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200 font-mono">
                          {t.senderId === data.userId 
                            ? (t.recipientName || t.recipientEmail || 'UNKNOWN_TARGET') 
                            : 'INBOUND_FUNDS'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {new Date(t.createdAt).toISOString().split('T')[0]} <span className="text-slate-700">|</span> {new Date(t.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold font-mono ${
                        t.senderId === data.userId ? 'text-slate-300' : 'text-emerald-400'
                      }`}>
                        {t.senderId === data.userId ? '-' : '+'}{formatCurrency(Number(t.amountSent), t.currencySent)}
                      </p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                        t.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          
          {/* Quick Transfer - Cyberpunk Widget */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md p-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
             <h3 className="text-xs font-bold text-slate-400 font-mono mb-4 flex items-center gap-2">
               <Send className="w-3 h-3" /> QUICK_LINK
             </h3>
             
             <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
               <div className="flex flex-col items-center gap-2 min-w-[64px] cursor-pointer group">
                  <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white border border-indigo-400 shadow-lg shadow-indigo-900/50 group-hover:scale-105 transition-all">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-indigo-300">NEW</span>
               </div>
               
               {[1,2,3].map((i) => (
                 <div key={i} className="flex flex-col items-center gap-2 min-w-[64px] cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">EMPTY</span>
                 </div>
               ))}
             </div>
          </div>

          {/* Virtual Card - Holographic Style */}
          <div className="group relative w-full aspect-[1.586/1] perspective-1000">
             <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black rounded-2xl border border-white/10 shadow-2xl p-6 flex flex-col justify-between overflow-hidden transform transition-transform duration-500 group-hover:rotate-y-6 group-hover:rotate-x-6">
                
                {/* Holographic Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ backgroundSize: '200% 200%' }}></div>
                
                <div className="flex justify-between items-start relative z-10">
                   <div className="text-xs font-mono text-indigo-400 tracking-widest border border-indigo-500/30 px-2 py-1 rounded bg-indigo-500/10">VIRTUAL_DEBIT</div>
                   <div className="font-bold italic text-white text-xl tracking-wider">VISA</div>
                </div>

                <div className="relative z-10">
                  <div className="flex gap-3 mb-4">
                     <div className="w-10 h-6 rounded bg-yellow-500/20 border border-yellow-500/50"></div>
                     <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full border border-white/20"></div>
                     </div>
                  </div>
                  
                  <div className="font-mono text-lg text-white tracking-widest mb-2 drop-shadow-md">
                    •••• •••• •••• 4242
                  </div>
                  
                  <div className="flex justify-between items-end">
                     <div>
                       <div className="text-[9px] text-slate-400 uppercase font-mono mb-0.5">Cardholder</div>
                       <div className="text-xs text-white font-medium uppercase tracking-wide">{data.user.firstName} {data.user.lastName}</div>
                     </div>
                     <div className="text-right">
                       <div className="text-[9px] text-slate-400 uppercase font-mono mb-0.5">Expires</div>
                       <div className="text-xs text-white font-mono">12/29</div>
                     </div>
                  </div>
                </div>
             </div>
          </div>
          
          <Button className="w-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-mono text-xs h-10">
            <CreditCard className="w-3 h-3 mr-2" /> MANAGE_CARDS
          </Button>

        </div>
      </div>
    </div>
  );
}
