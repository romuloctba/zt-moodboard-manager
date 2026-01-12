'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/store/projectStore';
import { useControllableState } from '@/hooks';
import { toast } from 'sonner';
import type { Project } from '@/types';

interface EditProjectDialogProps {
  /** The project to edit */
  project: Project;
  /** Trigger element - optional when using controlled mode */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function EditProjectDialog({ 
  project,
  children,
  open: controlledOpen,
  onOpenChange,
}: EditProjectDialogProps) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useControllableState(controlledOpen, false, onOpenChange);
  
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const { updateProject } = useProjectStore();

  // Reset form when project changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Name is required when editing (unlike creation)
    if (!name.trim()) {
      toast.error(t('validation.nameOrDescriptionRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(t('toast.updated'));
      setOpen(false);
    } catch (error) {
      toast.error(t('toast.updateFailed'));
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
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('editDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('editDialog.nameLabel')}</Label>
              <Input
                id="edit-name"
                placeholder={t('editDialog.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t('editDialog.descriptionLabel')}</Label>
              <Textarea
                id="edit-description"
                placeholder={t('editDialog.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tCommon('actions.saving') : t('editDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
