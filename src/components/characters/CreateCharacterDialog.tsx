'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectStore } from '@/store/projectStore';
import { toast } from 'sonner';

interface CreateCharacterDialogProps {
  /** Trigger element - optional when using controlled mode */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open state handler */
  onOpenChange?: (open: boolean) => void;
}

export function CreateCharacterDialog({ children, open: controlledOpen, onOpenChange }: CreateCharacterDialogProps) {
  const t = useTranslations('characters');
  const tCommon = useTranslations('common');
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };
  
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createCharacter } = useProjectStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error(t('validation.nameRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const character = await createCharacter(name.trim());
      if (character) {
        toast.success(t('toast.created'));
        setOpen(false);
        setName('');
      } else {
        toast.error(t('toast.noProject'));
      }
    } catch (error) {
      toast.error(t('toast.createFailed'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          {children}
        </DialogTrigger>
      )}
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="character-name">{t('createDialog.nameLabel')}</Label>
              <Input
                id="character-name"
                placeholder={t('createDialog.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tCommon('actions.creating') : t('createDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
