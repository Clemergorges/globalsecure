
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowRightLeft, 
  Settings, 
  LogOut,
  HelpCircle,
  Shield
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  const navigation = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transações', href: '/dashboard/transactions', icon: ArrowRightLeft },
    { name: 'Cartões', href: '/dashboard/cards', icon: CreditCard },
    { name: 'Segurança', href: '/dashboard/settings/security', icon: Shield },
    { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
    { name: 'Suporte', href: '/dashboard/support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight">GlobalSecure</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-blue-600 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {session.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.email}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
