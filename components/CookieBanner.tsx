'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = async () => {
    saveConsent(true);
  };

  const handleAcceptNecessary = async () => {
    saveConsent(false);
  };

  const saveConsent = async (marketing: boolean) => {
    // Save to local storage
    localStorage.setItem('cookie-consent', marketing ? 'all' : 'necessary');
    setIsVisible(false);

    // Try to sync with backend if logged in (fire and forget)
    try {
      await fetch('/api/consent/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookieConsent: true, // Always accept necessary
          marketingConsent: marketing
        })
      });
    } catch (e) {
      // Ignore error if not logged in
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center bg-transparent pointer-events-none">
      <Card className="w-full max-w-4xl shadow-2xl border-gray-200 bg-white/95 backdrop-blur pointer-events-auto">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-lg text-gray-900">🍪 Sua privacidade é importante</h3>
            <p className="text-sm text-gray-600">
              Utilizamos cookies para melhorar sua experiência e garantir a segurança da plataforma. 
              Alguns são essenciais, outros nos ajudam a entender como você usa o serviço.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
            <Button 
              variant="outline" 
              onClick={handleAcceptNecessary}
              className="whitespace-nowrap"
            >
              Apenas Necessários
            </Button>
            <Button 
              onClick={handleAcceptAll}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] whitespace-nowrap"
            >
              Aceitar Todos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
