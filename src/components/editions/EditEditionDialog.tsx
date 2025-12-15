'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Edition, EditionStatus } from '@/types';
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
import { CoverImagePicker } from './CoverImagePicker';
import { toast } from 'sonner';

interface EditEditionDialogProps {
  edition: Edition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEditionDialog({ edition, open, onOpenChange }: EditEditionDialogProps) {
  const t = useTranslations('editions');
  const tCommon = useTranslations('common');
  const { updateEdition } = useEditionStore();
  const [coverImageId, setCoverImageId] = useState<string | undefined>();

  const [title, setTitle] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [volume, setVolume] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [status, setStatus] = useState<EditionStatus>('draft');
  const [coverDescription, setCoverDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [estimatedPages, setEstimatedPages] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (edition) {
      setTitle(edition.title);
      setIssueNumber(edition.issueNumber?.toString() ?? '');
      setVolume(edition.volume?.toString() ?? '');
      setSynopsis(edition.synopsis ?? '');
      setStatus(edition.status);
      setCoverImageId(edition.coverImageId);
      setCoverDescription(edition.coverDescription ?? '');
      setGenre(edition.metadata?.genre ?? '');
      setTargetAudience(edition.metadata?.targetAudience ?? '');
      setEstimatedPages(edition.metadata?.estimatedPageCount?.toString() ?? '');
      setNotes(edition.metadata?.notes ?? '');
    }
  }, [edition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edition) return;

    if (!title.trim()) {
      toast.error(t('validation.titleRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await updateEdition(edition.id, {
        title: title.trim(),
        issueNumber: issueNumber ? parseInt(issueNumber) : undefined,
        volume: volume ? parseInt(volume) : undefined,
        synopsis: synopsis.trim() || undefined,
        status,
        coverImageId,
        coverDescription: coverDescription.trim() || undefined,
        metadata: {
          genre: genre.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
          estimatedPageCount: estimatedPages ? parseInt(estimatedPages) : undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success(t('toast.updated'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('toast.updateFailed'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const statuses: EditionStatus[] = ['draft', 'in-progress', 'review', 'complete'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">{t('createDialog.titleLabel')}</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-issue">{t('createDialog.issueNumberLabel')}</Label>
                  <Input
                    id="edit-issue"
                    type="number"
                    min="1"
                    value={issueNumber}
                    onChange={(e) => setIssueNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-volume">{t('createDialog.volumeLabel')}</Label>
                  <Input
                    id="edit-volume"
                    type="number"
                    min="1"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as EditionStatus)}>
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
                <Label htmlFor="edit-synopsis">{t('createDialog.synopsisLabel')}</Label>
                <textarea
                  id="edit-synopsis"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                />
              </div>
            </div>

            {/* Cover Info Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">{t('editDialog.coverTab')}</h3>
              
              {/* Cover Image Picker */}
              {edition && (
                <CoverImagePicker
                  projectId={edition.projectId}
                  currentImageId={coverImageId}
                  onImageSelect={setCoverImageId}
                  label={t('cover.imageLabel')}
                />
              )}

              <div className="grid gap-2">
                <Label htmlFor="cover-desc">{t('editDialog.coverDescriptionLabel')}</Label>
                <textarea
                  id="cover-desc"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={t('editDialog.coverDescriptionPlaceholder')}
                  value={coverDescription}
                  onChange={(e) => setCoverDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Metadata Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">{t('editDialog.infoTab')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="genre">{t('editDialog.genreLabel')}</Label>
                  <Input
                    id="genre"
                    placeholder={t('editDialog.genrePlaceholder')}
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="audience">{t('editDialog.targetAudienceLabel')}</Label>
                  <Input
                    id="audience"
                    placeholder={t('editDialog.targetAudiencePlaceholder')}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="est-pages">{t('editDialog.estimatedPagesLabel')}</Label>
                <Input
                  id="est-pages"
                  type="number"
                  min="1"
                  value={estimatedPages}
                  onChange={(e) => setEstimatedPages(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meta-notes">{t('editDialog.notesLabel')}</Label>
                <textarea
                  id="meta-notes"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={t('editDialog.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
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
