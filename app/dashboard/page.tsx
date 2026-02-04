import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Plus, ArrowRight, History, Globe, MoreHorizontal, CreditCard, Send } from 'lucide-react';
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
    <div className="space-y-8 max-w-6xl mx-auto pt-6">
      {/* Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Overview
          </h2>
          <p className="text-slate-500 mt-1">
            Welcome back, {data.user.firstName}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="gap-2 flex-1 md:flex-none border-slate-200 hover:bg-slate-50 text-slate-700">
            <Plus className="w-4 h-4" /> Add Money
          </Button>
          <Link href="/dashboard/send" className="flex-1 md:flex-none">
            <Button className="gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
              <Send className="w-4 h-4" /> Send Money
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Left Column: Balances & Cards */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Total Balance Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Your Accounts</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* EUR Main Account */}
              <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl relative overflow-hidden group transition-transform hover:-translate-y-1 duration-300">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Globe className="w-24 h-24 transform translate-x-4 -translate-y-4" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                       <img src="https://flagcdn.com/w40/eu.png" alt="EUR" className="w-6 h-6 rounded-full border-2 border-slate-800" />
                       <span className="font-medium text-slate-300">Euro</span>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-slate-500 cursor-pointer hover:text-white transition-colors" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold tracking-tight">
                      {formatCurrency(Number(wallet?.balanceEUR || 0), 'EUR')}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Main Account</div>
                  </div>
                </div>
              </div>

              {/* USD Secondary Account */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group transition-all hover:border-blue-200 hover:shadow-md">
                <div className="flex flex-col h-full justify-between min-h-[140px]">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                       <img src="https://flagcdn.com/w40/us.png" alt="USD" className="w-6 h-6 rounded-full border border-slate-100" />
                       <span className="font-medium text-slate-600">US Dollar</span>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold tracking-tight text-slate-900">
                      {formatCurrency(Number(wallet?.balanceUSD || 0), 'USD')}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Multi-currency</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Activity Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent Activity</h3>
              <Link href="/dashboard/activity" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {data.recentTransfers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <History className="w-6 h-6" />
                  </div>
                  <h3 className="text-slate-900 font-medium">No transactions yet</h3>
                  <p className="text-slate-500 text-sm mt-1">Your recent activity will appear here.</p>
                </div>
              ) : (
                data.recentTransfers.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                        t.senderId === data.userId 
                          ? 'bg-slate-50 border-slate-100 text-slate-600' 
                          : 'bg-green-50 border-green-100 text-green-600'
                      }`}>
                        {t.senderId === data.userId ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {t.senderId === data.userId 
                            ? (t.recipientName || t.recipientEmail || 'Unknown Recipient') 
                            : 'Received Funds'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(t.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        t.senderId === data.userId ? 'text-slate-900' : 'text-green-600'
                      }`}>
                        {t.senderId === data.userId ? '-' : '+'}{formatCurrency(Number(t.amountSent), t.currencySent)}
                      </p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6">
          {/* Quick Transfer Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" /> Quick Send
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
               {/* Mock Quick Contacts */}
               <div className="flex flex-col items-center gap-2 min-w-[60px] cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-blue-400 group-hover:text-blue-600 transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">New</span>
               </div>
               <div className="flex flex-col items-center gap-2 min-w-[60px] cursor-pointer opacity-50">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs border border-transparent">
                    JS
                  </div>
                  <span className="text-xs font-medium text-slate-600">John</span>
               </div>
            </div>
            <div className="mt-2 pt-4 border-t border-slate-100">
               <p className="text-xs text-slate-400 text-center">No recent contacts found.</p>
            </div>
          </div>

          {/* Cards Widget */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-bold flex items-center gap-2">
                   <CreditCard className="w-4 h-4" /> My Cards
                 </h3>
                 <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-slate-300 hover:text-white hover:bg-white/10">
                   Manage
                 </Button>
               </div>
               
               <div className="aspect-[1.586/1] bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 mb-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div className="text-xs font-mono text-white/70">Virtual Debit</div>
                     <span className="font-bold italic text-lg tracking-wider">VISA</span>
                  </div>
                  <div>
                    <div className="flex gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      <span className="text-sm font-mono ml-1">4242</span>
                    </div>
                    <div className="flex justify-between items-end">
                       <span className="text-xs text-white/70">Exp 12/28</span>
                       <span className="text-xs font-medium uppercase">{data.user.firstName} {data.user.lastName}</span>
                    </div>
                  </div>
               </div>
               
               <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none">
                 Create Virtual Card
               </Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
