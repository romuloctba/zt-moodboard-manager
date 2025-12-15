'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { ScriptPage, PageStatus } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditionStore } from '@/store/editionStore';
import { toast } from 'sonner';

interface EditPageDialogProps {
  page: ScriptPage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPageDialog({ page, open, onOpenChange }: EditPageDialogProps) {
  const t = useTranslations('editions.pages');
  const tCommon = useTranslations('common');
  const { updatePage } = useEditionStore();

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [setting, setSetting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [mood, setMood] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PageStatus>('draft');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (page) {
      setTitle(page.title ?? '');
      setGoal(page.goal ?? '');
      setSetting(page.setting ?? '');
      setTimeOfDay(page.timeOfDay ?? '');
      setMood(page.mood ?? '');
      setNotes(page.notes ?? '');
      setStatus(page.status);
    }
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;

    setIsLoading(true);
    try {
      await updatePage(page.id, {
        title: title.trim() || undefined,
        goal: goal.trim() || undefined,
        setting: setting.trim() || undefined,
        timeOfDay: timeOfDay.trim() || undefined,
        mood: mood.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      });
      toast.success(t('toast.updated'));
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const statuses: PageStatus[] = ['draft', 'scripted', 'review', 'approved'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-page-title">{t('createDialog.titleLabel')}</Label>
                <Input
                  id="edit-page-title"
                  placeholder={t('createDialog.titlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PageStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-page-goal">{t('createDialog.goalLabel')}</Label>
              <textarea
                id="edit-page-goal"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t('createDialog.goalPlaceholder')}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-page-setting">{t('createDialog.settingLabel')}</Label>
              <Input
                id="edit-page-setting"
                placeholder={t('createDialog.settingPlaceholder')}
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="time-of-day">{t('editDialog.timeOfDayLabel')}</Label>
                <Input
                  id="time-of-day"
                  placeholder={t('editDialog.timeOfDayPlaceholder')}
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mood">{t('editDialog.moodLabel')}</Label>
                <Input
                  id="mood"
                  placeholder={t('editDialog.moodPlaceholder')}
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="page-notes">{t('editDialog.notesLabel')}</Label>
              <textarea
                id="page-notes"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={t('editDialog.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
