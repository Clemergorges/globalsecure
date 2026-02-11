'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Coins, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const currencies = [
  { code: 'EUR', name: 'Euro (EUR)' },
  { code: 'USD', name: 'Dollar (USD)' },
  { code: 'BRL', name: 'Real (BRL)' },
] as const;

export function CurrencySwitcher() {
  const router = useRouter();
  const [currentCurrency, setCurrentCurrency] = useState<string>('EUR');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.wallet?.primaryCurrency) {
          setCurrentCurrency(data.user.wallet.primaryCurrency);
        }
      })
      .catch(console.error)
      .finally(() => setInitialLoading(false));
  }, []);

  const handleCurrencyChange = async (currency: string) => {
    if (currency === currentCurrency) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/settings/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency })
      });

      if (!res.ok) throw new Error('Failed to update');

      setCurrentCurrency(currency);
      router.refresh(); // Refresh data elsewhere
    } catch (error) {
      console.error(error);
      // Optional: Show toast error
    } finally {
      setLoading(false);
    }
  };

  const selected = currencies.find(c => c.code === currentCurrency) || currencies[0];

  if (initialLoading) {
    return <Button variant="outline" size="sm" disabled className="w-[180px]"><Loader2 className="w-4 h-4 animate-spin" /></Button>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading} className="w-[180px] justify-between">
          <span className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-gray-500" />
            {selected.name}
          </span>
          {loading && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => handleCurrencyChange(curr.code)}
            className="cursor-pointer flex items-center justify-between"
          >
            {curr.name}
            {currentCurrency === curr.code && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
