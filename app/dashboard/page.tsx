import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Wallet, Plus, MoreHorizontal, ArrowRight, History, Globe } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {data.user.firstName}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Here's what's happening with your accounts today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Add Money
          </Button>
          <Link href="/dashboard/send">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              <ArrowUpRight className="w-4 h-4" /> Send Money
            </Button>
          </Link>
        </div>
      </div>

      {/* Accounts & Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Primary Wallet Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-none text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-blue-100">Total Balance</CardTitle>
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(Number(wallet?.balanceEUR || 0), 'EUR')}
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-100">
              <span className="bg-green-400/20 text-green-300 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> +2.4%
              </span>
              <span>vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Account (USD) - Simulated for MVP */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">USD Account</CardTitle>
            <img src="https://flagcdn.com/w20/us.png" alt="USD" className="w-6 h-4 rounded-sm shadow-sm" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {formatCurrency(Number(wallet?.balanceUSD || 0), 'USD')}
            </div>
            <p className="text-xs text-slate-500">Available to spend</p>
          </CardContent>
        </Card>

        {/* Quick Actions / Promo */}
        <Card className="bg-slate-900 dark:bg-slate-950 border-slate-800 text-slate-300 shadow-sm flex flex-col justify-center items-center text-center p-6">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-white mb-1">Open New Account</h3>
          <p className="text-sm text-slate-500 mb-4">Get local bank details in 10+ currencies.</p>
          <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 hover:text-white w-full">
            Explore
          </Button>
        </Card>
      </div>

      {/* Main Content Area: Transactions */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Transaction History */}
        <Card className="md:col-span-4 lg:col-span-5 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</CardTitle>
              <CardDescription>Your last 5 transactions</CardDescription>
            </div>
            <Link href="/dashboard/activity">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.recentTransfers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    {/* @ts-ignore */}
                    <History className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-medium">No transactions yet</h3>
                  <p className="text-slate-500 text-sm mt-1">Send money to get started.</p>
                </div>
              ) : (
                data.recentTransfers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        t.senderId === data.userId 
                          ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' 
                          : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {t.senderId === data.userId ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {t.senderId === data.userId 
                            ? (t.recipientName || t.recipientEmail || 'Unknown Recipient') 
                            : 'Received Funds'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        t.senderId === data.userId ? 'text-slate-900 dark:text-white' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {t.senderId === data.userId ? '-' : '+'}{formatCurrency(Number(t.amountSent), t.currencySent)}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Side Widgets */}
        <div className="md:col-span-3 lg:col-span-2 space-y-6">
          {/* Quick Transfer Widget */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Quick Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 font-bold">
                    AB
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Alice Brown</p>
                    <p className="text-xs text-slate-500">Last sent 2 days ago</p>
                  </div>
                </div>
                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700">
                  Send to New Recipient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exchange Rate Widget */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" /> Live Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">EUR <ArrowRight className="w-3 h-3 inline mx-1" /> USD</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">1.0842</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">EUR <ArrowRight className="w-3 h-3 inline mx-1" /> GBP</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">0.8541</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">EUR <ArrowRight className="w-3 h-3 inline mx-1" /> BRL</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">5.4210</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
