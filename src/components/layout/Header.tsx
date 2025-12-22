'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileMenu } from './MobileMenu';
import { cn } from '@/lib/utils';

export interface HeaderAction {
  /** Unique identifier for the action */
  id: string;
  /** The action element to render (button/link) */
  element: ReactNode;
  /** Whether to show on mobile (in the sheet menu) - default true */
  showOnMobile?: boolean;
  /** Whether to show on desktop - default true */
  showOnDesktop?: boolean;
  /** Priority for mobile menu ordering (lower = higher priority) */
  mobilePriority?: number;
  /** Click handler - when provided, the action triggers this instead of relying on element's internal behavior */
  onClick?: () => void;
}

export interface HeaderProps {
  /** Main title displayed in the header */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Show back button - can be true (uses router.back()), a string (href), or false */
  backHref?: boolean | string;
  /** Custom back button handler */
  onBack?: () => void;
  /** Show the app logo/icon before the title */
  showLogo?: boolean;
  /** Array of action items to display */
  actions?: HeaderAction[];
  /** Additional content to render in mobile menu footer */
  mobileMenuFooter?: ReactNode;
  /** Additional className for the header */
  className?: string;
  /** Make header sticky */
  sticky?: boolean;
}

export function Header({
  title,
  subtitle,
  backHref,
  onBack,
  showLogo = false,
  actions = [],
  mobileMenuFooter,
  className,
  sticky = true,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof backHref === 'string') {
      router.push(backHref);
    } else if (backHref === true) {
      router.back();
    }
  };

  // Filter actions for desktop and mobile
  const desktopActions = actions.filter(
    (action) => action.showOnDesktop !== false
  );
  const mobileActions = actions
    .filter((action) => action.showOnMobile !== false)
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99));

  const showBackButton = backHref !== undefined && backHref !== false;

  return (
    <header
      className={cn(
        'border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60',
        sticky && 'sticky top-0 z-10',
        className
      )}
    >
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left section: Back button + Logo/Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            
            {showLogo && (
              <Palette className="w-7 h-7 md:w-8 md:h-8 text-primary shrink-0" />
            )}
            
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right section: Actions */}
          {/* Desktop actions - hidden on mobile */}
          <div className="hidden md:flex items-center gap-4">
            {desktopActions.map((action) => (
              <div key={action.id} onClick={action.onClick}>
                {action.element}
              </div>
            ))}
          </div>

          {/* Mobile menu - shown on mobile/tablet */}
          {mobileActions.length > 0 && (
            <div className="md:hidden">
              <MobileMenu
                actions={mobileActions}
                footer={mobileMenuFooter}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
