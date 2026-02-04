import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Plus, Send, CreditCard, UserPlus, HelpCircle, MoreHorizontal, Wallet, Lock } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { MOCK_TRANSACTIONS, MOCK_CARDS } from '@/lib/mock-data';

async function getData() {
  const session = await getSession();
  if (!session) return null;

  // @ts-ignore
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: session.userId },
    include: { wallet: true }
  });

  const dbTransfers = await prisma.transfer.findMany({
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

  // Merge DB data with Mock data for rich demo
  const transfers = dbTransfers.length > 0 ? dbTransfers : MOCK_TRANSACTIONS;
  const cards = MOCK_CARDS; // Using mock cards for now as requested

  // @ts-ignore
  return { user, transfers, cards, userId: session.userId };
}

export default async function DashboardPage() {
  const data = await getData();

  if (!data || !data.user) {
    return <div className="p-8 text-center text-slate-500">Sessão expirada. Por favor faça login novamente.</div>;
  }

  const wallet = data.user.wallet;
  const balance = wallet?.balanceEUR || 1250.50; // Fallback mock balance

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* 1. Balance Card & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Balance Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl group">
           <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="w-48 h-48 text-indigo-400" />
           </div>
           
           <div className="relative z-10">
              <p className="text-indigo-300 font-medium mb-2 flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                 Saldo Total Disponível
              </p>
              <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-6">
                 {formatCurrency(Number(balance), 'EUR')}
              </h1>
              
              <div className="flex flex-wrap gap-4">
                 <Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-900/20 h-12 px-6 rounded-xl font-bold">
                    <Plus className="w-5 h-5 mr-2" /> Recarregar
                 </Button>
                 <Button variant="outline" className="border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10 hover:text-white h-12 px-6 rounded-xl font-medium">
                    <MoreHorizontal className="w-5 h-5 mr-2" /> Detalhes
                 </Button>
              </div>
           </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
           {[
              { label: 'Novo Envio', icon: Send, color: 'bg-indigo-600', href: '/dashboard/send' },
              { label: 'Gerar Cartão', icon: CreditCard, color: 'bg-rose-600', href: '/dashboard/cards' },
              { label: 'Convidar', icon: UserPlus, color: 'bg-cyan-600', href: '#' },
              { label: 'Suporte', icon: HelpCircle, color: 'bg-slate-700', href: '#' }
           ].map((action, i) => (
              <Link key={i} href={action.href} className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900 border border-white/5 hover:border-white/20 hover:scale-[1.02] transition-all cursor-pointer group`}>
                 <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <action.icon className="w-6 h-6" />
                 </div>
                 <span className="text-sm font-medium text-slate-300 group-hover:text-white">{action.label}</span>
              </Link>
           ))}
        </div>
      </div>

      {/* 2. Active Cards Section */}
      <section>
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Cartões Ativos</h2>
            <Link href="/dashboard/cards" className="text-sm text-indigo-400 hover:text-indigo-300">Gerenciar</Link>
         </div>
         
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.cards.map((card) => (
               <div key={card.id} className="relative bg-slate-900 border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors group">
                  <div className="flex justify-between items-start mb-8">
                     <div className="w-10 h-6 bg-white/10 rounded"></div>
                     <span className={`text-xs font-bold px-2 py-1 rounded ${card.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {card.status}
                     </span>
                  </div>
                  <div className="mb-4">
                     <p className="text-slate-400 text-xs mb-1">{card.alias}</p>
                     <p className="text-xl text-white font-mono tracking-widest">•••• •••• •••• {card.last4}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                     <span>Exp: {card.expiry}</span>
                     <span className="font-bold text-slate-300">{card.brand}</span>
                  </div>
               </div>
            ))}
            
            {/* Add New Card Button */}
            <button className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group">
               <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-indigo-500 text-slate-400 group-hover:text-white transition-colors">
                  <Plus className="w-6 h-6" />
               </div>
               <span className="text-sm font-medium text-slate-400 group-hover:text-indigo-300">Criar Novo Cartão</span>
            </button>
         </div>
      </section>

      {/* 3. Recent Transactions */}
      <section className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
         <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Últimos Envios</h2>
            <Link href="/dashboard/activity" className="text-sm text-indigo-400 hover:text-indigo-300">Ver tudo</Link>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-white/5 text-slate-400 text-xs uppercase font-medium">
                  <tr>
                     <th className="px-6 py-4">Destinatário</th>
                     <th className="px-6 py-4">Data</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {data.transfers.map((t) => (
                     <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                 // @ts-ignore
                                 (t.senderId === data.userId && t.type !== 'CREDIT') ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                 {/* @ts-ignore */}
                                 {(t.senderId === data.userId && t.type !== 'CREDIT') ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                              </div>
                              <div>
                                 {/* @ts-ignore */}
                                 <p className="font-medium text-slate-200">{t.recipientName || 'Desconhecido'}</p>
                                 <p className="text-xs text-slate-500">Transferência</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                           {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 
                              t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'
                           }`}>
                              {t.status}
                           </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold font-mono ${
                           // @ts-ignore
                           (t.senderId === data.userId && t.type !== 'CREDIT') ? 'text-slate-200' : 'text-emerald-400'
                        }`}>
                           {/* @ts-ignore */}
                           {(t.senderId === data.userId && t.type !== 'CREDIT') ? '-' : '+'}{formatCurrency(Number(t.amountSent), t.currencySent)}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>
    </div>
  );
}
