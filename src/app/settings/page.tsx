'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Section Components
import {
  StorageSection,
  BackupSection,
  DangerZoneSection,
  LanguageSection,
  InstallSection,
  RestoreConfirmDialog,
  ClearDataConfirmDialog,
} from './components';

// Hooks
import { useStorageStats } from '@/hooks/useStorageStats';
import { useBackupRestore } from '@/hooks/useBackupRestore';

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');
  
  // Storage stats
  const storageStats = useStorageStats();
  
  // Backup and restore operations
  const backupRestore = useBackupRestore({
    onBackupComplete: () => {
      toast.success(t('backup.toast.created'));
    },
    onRestoreComplete: () => {
      toast.success(t('backup.toast.restored'));
      storageStats.refetch();
      // Small delay then redirect to home
      setTimeout(() => {
        router.push('/');
      }, 1500);
    },
    onClearComplete: (result) => {
      toast.success(t('dangerZone.toast.cleared', { count: result.filesDeleted }));
      storageStats.refetch();
    },
    onError: (error) => {
      // Handle validation errors for restore
      if (backupRestore.validationError) {
        toast.error(backupRestore.validationError);
      } else {
        toast.error(error.message);
      }
    },
  });

  // Dialog states
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Handle file change - validate and show confirm dialog if valid
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isValid = await backupRestore.handleFileSelect(e);
    if (isValid) {
      setShowRestoreConfirm(true);
    }
  }, [backupRestore]);

  // Handle restore confirmation
  const handleConfirmRestore = useCallback(async () => {
    setShowRestoreConfirm(false);
    const success = await backupRestore.confirmRestore();
    if (!success) {
      toast.error(t('backup.toast.restoreFailed'));
    }
  }, [backupRestore, t]);

  // Handle clear data confirmation
  const handleConfirmClear = useCallback(async () => {
    setShowClearConfirm(false);
    const result = await backupRestore.clearData();
    if (!result) {
      toast.error(t('dangerZone.toast.clearFailed'));
    }
  }, [backupRestore, t]);

  // Handle backup
  const handleBackup = useCallback(async () => {
    const success = await backupRestore.createBackup();
    if (!success) {
      toast.error(t('backup.toast.createFailed'));
    }
  }, [backupRestore, t]);

  const isOperationInProgress = backupRestore.isBackingUp || backupRestore.isRestoring;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{t('title')}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Install App */}
        <InstallSection />

        {/* Language Selection */}
        <LanguageSection />

        {/* Storage Stats */}
        <StorageSection
          stats={storageStats.stats}
          storageInfo={storageStats.storageInfo}
          loading={storageStats.loading}
          formatBytes={storageStats.formatBytes}
        />

        {/* Backup & Restore */}
        <BackupSection
          isBackingUp={backupRestore.isBackingUp}
          isRestoring={backupRestore.isRestoring}
          backupProgress={backupRestore.backupProgress}
          restoreProgress={backupRestore.restoreProgress}
          onBackup={handleBackup}
          onSelectFile={() => backupRestore.fileInputRef.current?.click()}
          fileInputRef={backupRestore.fileInputRef}
          onFileChange={handleFileChange}
        />

        {/* Danger Zone */}
        <DangerZoneSection
          isClearing={backupRestore.isClearing}
          disabled={isOperationInProgress}
          onClear={() => setShowClearConfirm(true)}
        />
      </main>

      {/* Restore Confirmation Dialog */}
      <RestoreConfirmDialog
        open={showRestoreConfirm}
        onOpenChange={(open) => {
          setShowRestoreConfirm(open);
          if (!open) backupRestore.cancelRestore();
        }}
        manifest={backupRestore.pendingManifest}
        currentStats={storageStats.stats}
        onConfirm={handleConfirmRestore}
      />

      {/* Clear Data Confirmation Dialog */}
      <ClearDataConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        currentStats={storageStats.stats}
        onConfirm={handleConfirmClear}
      />
    </div>
  );
}
