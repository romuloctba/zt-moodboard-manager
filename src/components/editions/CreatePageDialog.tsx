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
import { useEditionStore } from '@/store/editionStore';
import { toast } from 'sonner';

interface CreatePageDialogProps {
  /** Trigger element - optional when using controlled mode */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open state handler */
  onOpenChange?: (open: boolean) => void;
}

export function CreatePageDialog({ children, open: controlledOpen, onOpenChange }: CreatePageDialogProps) {
  const t = useTranslations('editions.pages');
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
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [setting, setSetting] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createPage } = useEditionStore();

  const resetForm = () => {
    setTitle('');
    setGoal('');
    setSetting('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      await createPage({
        title: title.trim() || undefined,
        goal: goal.trim() || undefined,
        setting: setting.trim() || undefined,
      });
      toast.success(t('toast.created'));
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      {children && (
        <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          {children}
        </DialogTrigger>
      )}
      <DialogContent 
        className="sm:max-w-[500px]"
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
              <Label htmlFor="page-title">{t('createDialog.titleLabel')}</Label>
              <Input
                id="page-title"
                placeholder={t('createDialog.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="page-goal">{t('createDialog.goalLabel')}</Label>
              <textarea
                id="page-goal"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t('createDialog.goalPlaceholder')}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="page-setting">{t('createDialog.settingLabel')}</Label>
              <Input
                id="page-setting"
                placeholder={t('createDialog.settingPlaceholder')}
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
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
