'use client';

import { Menu, Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-xl px-6 md:px-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-slate-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:flex items-center gap-2 text-slate-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          <Search className="w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar transação..." 
            className="bg-transparent border-none outline-none text-sm w-64 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
        
        <div className="flex items-center gap-3 pl-2">
           <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">Usuário</p>
              <p className="text-xs text-slate-400">Premium</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-slate-900 shadow-lg">
              <User className="w-5 h-5 text-white" />
           </div>
        </div>
      </div>
    </header>
  );
}
