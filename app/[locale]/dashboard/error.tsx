'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-red-500/10 p-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-white">Algo deu errado!</h2>
      <p className="text-slate-400">Não foi possível carregar o dashboard.</p>
      <Button
        variant="outline"
        onClick={() => reset()}
        className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
      >
        Tentar novamente
      </Button>
    </div>
  );
}
