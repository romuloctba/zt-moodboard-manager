'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BackupManifest } from '@/lib/export/backupService';
import type { StorageStats } from '@/hooks/useStorageStats';

interface RestoreConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifest: BackupManifest | null;
  currentStats: StorageStats | null;
  onConfirm: () => void;
}

/**
 * Dialog for confirming restore operation
 */
export function RestoreConfirmDialog({
  open,
  onOpenChange,
  manifest,
  currentStats,
  onConfirm,
}: RestoreConfirmDialogProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('backup.confirmRestore.title')}
          </DialogTitle>
          <DialogDescription>
            {t('backup.confirmRestore.description')}
          </DialogDescription>
        </DialogHeader>

        {manifest && (
          <div className="space-y-3 py-2">
            <div className="text-sm font-medium">{t('backup.confirmRestore.details')}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">{t('backup.confirmRestore.created')}</div>
              <div>{new Date(manifest.createdAt).toLocaleString()}</div>
              <div className="text-muted-foreground">{t('backup.confirmRestore.projects')}</div>
              <div>{manifest.stats.projects}</div>
              <div className="text-muted-foreground">{t('backup.confirmRestore.characters')}</div>
              <div>{manifest.stats.characters}</div>
              <div className="text-muted-foreground">{t('backup.confirmRestore.images')}</div>
              <div>{manifest.stats.images}</div>
              <div className="text-muted-foreground">{t('backup.confirmRestore.editions')}</div>
              <div>{manifest.stats.editions}</div>
              <div className="text-muted-foreground">{t('backup.confirmRestore.scriptPages')}</div>
              <div>{manifest.stats.scriptPages}</div>
              <div className="text-muted-foreground">{t('backup.confirmRestore.panels')}</div>
              <div>{manifest.stats.panels}</div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <Trash2 className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">
                {t('backup.confirmRestore.warning', { 
                  projects: currentStats?.projects || 0, 
                  characters: currentStats?.characters || 0, 
                  images: currentStats?.images || 0,
                  editions: currentStats?.editions || 0,
                  scriptPages: currentStats?.scriptPages || 0,
                  panels: currentStats?.panels || 0
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('actions.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Upload className="h-4 w-4 mr-2" />
            {t('backup.confirmRestore.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ClearDataConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStats: StorageStats | null;
  onConfirm: () => void;
}

/**
 * Dialog for confirming clear all data operation
 */
export function ClearDataConfirmDialog({
  open,
  onOpenChange,
  currentStats,
  onConfirm,
}: ClearDataConfirmDialogProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t('dangerZone.confirmClear.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dangerZone.confirmClear.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              {t('dangerZone.confirmClear.warning')}
              <ul className="list-disc list-inside mt-1">
                <li>{t('dangerZone.confirmClear.projects', { count: currentStats?.projects || 0 })}</li>
                <li>{t('dangerZone.confirmClear.characters', { count: currentStats?.characters || 0 })}</li>
                <li>{t('dangerZone.confirmClear.images', { count: currentStats?.images || 0 })}</li>
                <li>{t('dangerZone.confirmClear.editions', { count: currentStats?.editions || 0 })}</li>
                <li>{t('dangerZone.confirmClear.scriptPages', { count: currentStats?.scriptPages || 0 })}</li>
                <li>{t('dangerZone.confirmClear.panels', { count: currentStats?.panels || 0 })}</li>
                <li>{t('dangerZone.confirmClear.files')}</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('actions.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('dangerZone.confirmClear.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
