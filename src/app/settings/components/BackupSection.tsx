'use client';

import { useTranslations } from 'next-intl';
import { 
  Download, 
  Upload, 
  Loader2, 
  AlertTriangle,
  FileArchive,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getProgressPercent } from '@/hooks/useBackupRestore';
import type { BackupProgress, RestoreProgress } from '@/lib/export/backupService';

interface BackupSectionProps {
  isBackingUp: boolean;
  isRestoring: boolean;
  backupProgress: BackupProgress | null;
  restoreProgress: RestoreProgress | null;
  onBackup: () => void;
  onSelectFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Settings section for backup and restore operations
 */
export function BackupSection({
  isBackingUp,
  isRestoring,
  backupProgress,
  restoreProgress,
  onBackup,
  onSelectFile,
  fileInputRef,
  onFileChange,
}: BackupSectionProps) {
  const t = useTranslations('settings');

  const isDisabled = isBackingUp || isRestoring;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t('backup.title')}
        </CardTitle>
        <CardDescription>
          {t('backup.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Backup */}
        <ActionRow
          icon={<Download className="h-5 w-5 text-primary" />}
          iconBgClass="bg-primary/10"
          title={t('backup.create.title')}
          description={t('backup.create.description')}
          action={
            <Button onClick={onBackup} disabled={isDisabled}>
              {isBackingUp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('backup.create.inProgress')}
                </>
              ) : (
                <>
                  <FileArchive className="h-4 w-4 mr-2" />
                  {t('backup.create.button')}
                </>
              )}
            </Button>
          }
        />

        {/* Backup Progress */}
        {isBackingUp && backupProgress && (
          <ProgressIndicator progress={backupProgress} />
        )}

        {/* Restore */}
        <ActionRow
          icon={<Upload className="h-5 w-5 text-orange-500" />}
          iconBgClass="bg-orange-500/10"
          title={t('backup.restore.title')}
          description={t('backup.restore.description')}
          action={
            <Button 
              variant="outline"
              onClick={onSelectFile}
              disabled={isDisabled}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('backup.restore.inProgress')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('backup.restore.button')}
                </>
              )}
            </Button>
          }
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={onFileChange}
        />

        {/* Restore Progress */}
        {isRestoring && restoreProgress && (
          <ProgressIndicator progress={restoreProgress} />
        )}

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-orange-500">{t('backup.warning.title')}</div>
            <div className="text-muted-foreground">
              {t('backup.warning.description')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionRowProps {
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  description: string;
  action: React.ReactNode;
}

function ActionRow({ icon, iconBgClass, title, description, action }: ActionRowProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBgClass}`}>
          {icon}
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

interface ProgressIndicatorProps {
  progress: BackupProgress | RestoreProgress;
}

function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const percent = getProgressPercent(progress);
  
  return (
    <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{progress.message}</span>
        <span>{percent}%</span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}
