
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const wallet = await prisma.wallet.findUnique({
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
    // Fallback if wallet doesn't exist (should happen only if creation failed)
    return (
      <div className="p-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <h2 className="text-red-800 font-bold text-lg">Carteira não encontrada</h2>
            <p className="text-red-600">Ocorreu um erro ao carregar sua carteira. Por favor, contate o suporte.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eurBalance = wallet.balances.find(b => b.currency === 'EUR')?.amount.toNumber() || 0;
  const usdtBalance = wallet.balances.find(b => b.currency === 'USDT')?.amount.toNumber() || 0;

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Visão Geral</h1>
          <p className="text-gray-500">Bem-vindo de volta, {session.email}</p>
        </div>
        <div className="flex gap-2">
           <Link href="/dashboard/wallet/deposit">
             <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
               <ArrowDownLeft className="w-4 h-4" /> Depositar
             </Button>
           </Link>
           <Link href="/dashboard/transfers/create">
             <Button variant="outline" className="gap-2">
               <ArrowUpRight className="w-4 h-4" /> Transferir
             </Button>
           </Link>
        </div>
      </div>

      {/* Balances */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo Total (EUR)</CardTitle>
            <span className="text-2xl font-bold text-gray-400">€</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(eurBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponível para transferências
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo Crypto (USDT)</CardTitle>
            <span className="text-2xl font-bold text-gray-400">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdtBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Rede Polygon (MATIC)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-semibold tracking-tight text-gray-900">Transações Recentes</h2>
           <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium">
             Ver extrato completo <History className="w-4 h-4" />
           </Link>
        </div>
        
        <Card>
           <CardContent className="p-0">
             {wallet.transactions.length === 0 ? (
               <div className="p-8 text-center text-gray-500">
                 Nenhuma transação recente.
               </div>
             ) : (
               <div className="divide-y divide-gray-100">
                 {wallet.transactions.map((tx) => (
                   <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                     <div className="flex flex-col gap-1">
                       <span className="font-medium text-gray-900">{tx.description}</span>
                       <span className="text-xs text-gray-500">
                         {new Date(tx.createdAt).toLocaleDateString('pt-PT', {
                           day: '2-digit',
                           month: 'long',
                           year: 'numeric',
                           hour: '2-digit',
                           minute: '2-digit'
                         })}
                       </span>
                     </div>
                     <div className={`font-bold ${['CREDIT', 'DEPOSIT'].includes(tx.type) ? 'text-green-600' : 'text-gray-900'}`}>
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
