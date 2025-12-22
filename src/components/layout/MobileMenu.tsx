'use client';

import { useState } from 'react';
import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { HeaderAction } from './Header';

interface MobileMenuProps {
  /** Actions to display in the mobile menu */
  actions: HeaderAction[];
  /** Optional footer content */
  footer?: ReactNode;
}

export function MobileMenu({ actions, footer }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('common');

  const handleActionClick = (action: HeaderAction, e: React.MouseEvent) => {
    // Only handle if onClick is defined - otherwise let the element handle its own clicks
    if (action.onClick) {
      e.stopPropagation();
      // Close the sheet
      setOpen(false);
      // Call the onClick handler
      action.onClick();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('navigation.menu')}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>{t('navigation.menu')}</SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col gap-3 mt-6">
          {actions.map((action) => (
            <div 
              key={action.id} 
              className="w-full justify-center flex"
              onClick={(e) => handleActionClick(action, e)}
            >
              {action.element}
            </div>
          ))}
        </nav>

        {footer && (
          <div className="mt-auto pt-6 border-t border-border">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
