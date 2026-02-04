import Link from 'next/link';
import { Send, CreditCard, UserPlus, HelpCircle } from 'lucide-react';

const actions = [
  { label: 'Novo Envio', icon: Send, href: '/dashboard/send', color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Gerar Cartão', icon: CreditCard, href: '/dashboard/cards', color: 'text-purple-500', bg: 'bg-purple-50' },
  { label: 'Convidar', icon: UserPlus, href: '#', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Suporte', icon: HelpCircle, href: '#', color: 'text-amber-500', bg: 'bg-amber-50' }
];

export function QuickActionsGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {actions.map((action, i) => (
        <Link 
          key={i} 
          href={action.href} 
          className="card-premium p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-transparent hover:border-[var(--color-primary)]/20"
        >
          <div className={`w-12 h-12 rounded-full ${action.bg} flex items-center justify-center ${action.color}`}>
            <action.icon className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-700">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
