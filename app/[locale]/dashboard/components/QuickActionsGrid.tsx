import { Link } from '@/i18n/navigation';
import { Send, CreditCard, UserPlus, HelpCircle, ArrowRight } from 'lucide-react';

const actions = [
  { 
    label: 'Novo Envio', 
    desc: 'Transferência rápida',
    icon: Send, 
    href: '/dashboard/send', 
    color: 'text-blue-600', 
    bg: 'bg-blue-100',
    border: 'hover:border-blue-200'
  },
  { 
    label: 'Cartões', 
    desc: 'Gerenciar virtuais',
    icon: CreditCard, 
    href: '/dashboard/cards', 
    color: 'text-purple-600', 
    bg: 'bg-purple-100',
    border: 'hover:border-purple-200'
  },
  { 
    label: 'Convidar', 
    desc: 'Ganhe bônus',
    icon: UserPlus, 
    href: '#', 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-100',
    border: 'hover:border-emerald-200'
  },
  { 
    label: 'Ajuda', 
    desc: 'Suporte 24/7',
    icon: HelpCircle, 
    href: '#', 
    color: 'text-amber-600', 
    bg: 'bg-amber-100',
    border: 'hover:border-amber-200'
  }
];

export function QuickActionsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      {actions.map((action, i) => (
        <Link 
          key={i} 
          href={action.href} 
          className={`card-premium p-4 flex items-start gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-transparent ${action.border} group`}
        >
          <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center ${action.color} shadow-sm group-hover:scale-110 transition-transform`}>
            <action.icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center justify-between">
              {action.label}
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-gray-400" />
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
