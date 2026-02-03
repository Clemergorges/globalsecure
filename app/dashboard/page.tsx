import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, CreditCard, Wallet } from 'lucide-react';
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

  return { user, recentTransfers, userId: session.userId };
}

export default async function DashboardPage() {
  const data = await getData();

  if (!data || !data.user) {
    return <div className="p-4">Please log in.</div>;
  }

  const wallet = data.user.wallet;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-none text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Total Balance</CardTitle>
            <Wallet className="w-4 h-4 text-blue-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(wallet?.balanceEUR || 0), 'EUR')}
            </div>
            <p className="text-xs text-blue-200 mt-1">Available to spend</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/dashboard/send">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Send
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="border-slate-700 hover:bg-slate-800">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Add Money
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentTransfers.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions yet.</p>
            ) : (
              data.recentTransfers.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${t.senderId === data.userId ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                      {t.senderId === data.userId ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {t.senderId === data.userId ? 'Sent Money' : 'Received Money'}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${t.senderId === data.userId ? 'text-slate-200' : 'text-green-400'}`}>
                      {t.senderId === data.userId ? '-' : '+'}{formatCurrency(Number(t.amountSource), t.currencySource)}
                    </p>
                    <p className="text-xs text-slate-500">{t.status.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
