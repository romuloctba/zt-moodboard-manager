'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();
  const t = useTranslations('common');
  const [countdown, setCountdown] = useState(5);
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    if (!autoRedirect) return;

    if (countdown <= 0) {
      router.push('/');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, autoRedirect, router]);

  const handleStay = () => {
    setAutoRedirect(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <h1 className="text-6xl font-bold text-primary mb-4">{t('notFound.title')}</h1>
        <h2 className="text-2xl font-semibold mb-2">{t('notFound.heading')}</h2>
        <p className="text-muted-foreground mb-8">
          {t('notFound.description')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('actions.goBack')}
          </Button>
          <Button onClick={() => router.push('/')}>
            <Home className="h-4 w-4 mr-2" />
            {t('actions.goHome')}
          </Button>
        </div>

        {autoRedirect && (
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('notFound.redirecting', { seconds: countdown })}</span>
            </div>
            <button
              onClick={handleStay}
              className="text-primary hover:underline"
            >
              {t('notFound.cancelRedirect')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
