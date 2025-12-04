'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // For static export, just redirect to home for unknown routes
    const timer = setTimeout(() => {
      router.push('/');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Page not found</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Redirecting to home...</p>
      </div>
    </div>
  );
}
