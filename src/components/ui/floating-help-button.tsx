'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FloatingHelpButtonProps {
  className?: string;
}

/**
 * Floating Help Button Component
 * 
 * A stylish, accessible floating action button that provides quick access to the help page.
 * Features smooth animations, tooltip, and responsive behavior.
 * 
 * @example
 * ```tsx
 * <FloatingHelpButton />
 * ```
 */
export function FloatingHelpButton({ className }: FloatingHelpButtonProps) {
  const tCommon = useTranslations('common');
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2',
        'transition-all duration-300 ease-in-out',
        className
      )}
    >
      {/* Expanded hint (shows on hover) */}
      <div
        className={cn(
          'flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg',
          'transition-all duration-300 ease-in-out',
          'transform origin-right',
          isHovered ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        )}
      >
        <span className="text-sm font-medium whitespace-nowrap">
          {tCommon('help.needHelp')}
        </span>
      </div>

      {/* Main button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              asChild
              className={cn(
                'h-14 w-14 rounded-full shadow-2xl',
                'bg-primary hover:bg-primary/90',
                'transition-all duration-300 ease-in-out',
                'hover:scale-110 active:scale-95',
                'ring-4 ring-primary/20',
                'group relative overflow-hidden'
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <Link href="/help" className="flex items-center justify-center">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Icon */}
                <HelpCircle className={cn(
                  'w-6 h-6 relative z-10',
                  'transition-transform duration-300',
                  'group-hover:rotate-12'
                )} />
                
                {/* Pulse animation ring */}
                <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="font-medium">
            {tCommon('help.viewGuide')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Optional dismiss button (appears on hover) */}
      <button
        onClick={() => setIsDismissed(true)}
        className={cn(
          'absolute -top-2 -right-2 w-6 h-6 rounded-full',
          'bg-muted hover:bg-muted-foreground/20',
          'flex items-center justify-center',
          'transition-all duration-200',
          'opacity-0 group-hover:opacity-100',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
        aria-label={tCommon('actions.dismiss')}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
