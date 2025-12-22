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

interface CreateEditionDialogProps {
  projectId: string;
  /** Trigger element - optional when using controlled mode */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open state handler */
  onOpenChange?: (open: boolean) => void;
}

export function CreateEditionDialog({ projectId, children, open: controlledOpen, onOpenChange }: CreateEditionDialogProps) {
  const t = useTranslations('editions');
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
  const [issueNumber, setIssueNumber] = useState('');
  const [volume, setVolume] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createEdition } = useEditionStore();

  const resetForm = () => {
    setTitle('');
    setIssueNumber('');
    setVolume('');
    setSynopsis('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error(t('validation.titleRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await createEdition(projectId, title.trim(), {
        issueNumber: issueNumber ? parseInt(issueNumber) : undefined,
        volume: volume ? parseInt(volume) : undefined,
        synopsis: synopsis.trim() || undefined,
      });
      toast.success(t('toast.created'));
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(t('toast.createFailed'));
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
              <Label htmlFor="edition-title">{t('createDialog.titleLabel')}</Label>
              <Input
                id="edition-title"
                placeholder={t('createDialog.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="issue-number">{t('createDialog.issueNumberLabel')}</Label>
                <Input
                  id="issue-number"
                  type="number"
                  min="1"
                  placeholder={t('createDialog.issueNumberPlaceholder')}
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="volume">{t('createDialog.volumeLabel')}</Label>
                <Input
                  id="volume"
                  type="number"
                  min="1"
                  placeholder={t('createDialog.volumePlaceholder')}
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="synopsis">{t('createDialog.synopsisLabel')}</Label>
              <textarea
                id="synopsis"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t('createDialog.synopsisPlaceholder')}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
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
