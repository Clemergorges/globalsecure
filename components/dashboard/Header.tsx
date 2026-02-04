'use client';

import { Menu, Bell, Search, User } from 'lucide-react';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 md:px-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-gray-500 hover:text-gray-900">
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:flex items-center gap-2 text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border border-transparent focus-within:border-[var(--color-primary)] transition-all w-64">
          <Search className="w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar transação..." 
            className="bg-transparent border-none outline-none text-sm w-full text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-500 hover:text-[var(--color-primary)] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
        </button>
        
        <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-700"></div>
        
        <div className="flex items-center gap-3">
           <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">João Silva</p>
              <p className="text-xs text-gray-500">Premium</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
           </div>
        </div>
      </div>
    </header>
  );
}
