'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Header } from '@/components/layout';

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

// Sync Components
import {
  SyncSection,
  ConflictDialog,
} from '@/components/sync';

// Hooks
import { useStorageStats } from '@/hooks/useStorageStats';
import { useBackupRestore } from '@/hooks/useBackupRestore';
import { useSync, useAutoSync } from '@/hooks/useSync';

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');
  
  // Storage stats
  const storageStats = useStorageStats();
  
  // Sync operations
  const sync = useSync();
  
  // Auto-sync setup
  useAutoSync(
    sync.settings?.autoSyncEnabled ?? false,
    sync.settings?.syncIntervalMinutes ?? 15,
    sync.settings?.syncOnStartup ?? true,
    sync.isConnected,
    sync.sync
  );
  
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
      <Header
        title={t('title')}
        backHref={true}
      />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Install App */}
        <InstallSection />

        {/* Language Selection */}
        <LanguageSection />

        {/* Cloud Sync */}
        <SyncSection
          isConnected={sync.isConnected}
          isConnecting={sync.isConnecting}
          isSyncing={sync.isSyncing}
          settings={sync.settings}
          progress={sync.progress}
          onConnect={sync.connect}
          onDisconnect={sync.disconnect}
          onSync={() => sync.sync({ force: true })}
          onSettingsChange={sync.updateSettings}
          labels={{
            title: t('sync.title'),
            description: t('sync.description'),
            notConnected: {
              title: t('sync.connect.title'),
              description: t('sync.connect.description'),
              button: t('sync.connect.button'),
              connecting: t('sync.status.connecting'),
            },
            account: {
              connectedAs: t('sync.account.connectedAs'),
              lastSync: t('sync.account.lastSync'),
              never: t('sync.account.never'),
              syncNow: t('sync.actions.syncNow'),
              syncing: t('sync.status.syncing'),
              disconnect: t('sync.account.disconnect'),
            },
            settings: {
              autoSync: t('sync.settings.autoSync'),
              autoSyncDescription: t('sync.settings.autoSyncDescription'),
              syncInterval: t('sync.settings.syncInterval'),
              syncOnStartup: t('sync.settings.syncOnStartup'),
              syncOnStartupDescription: t('sync.settings.syncOnStartupDescription'),
              conflictResolution: t('sync.settings.conflictStrategy'),
              conflictResolutionDescription: t('sync.settings.conflictStrategyDescription'),
              interval5: t('sync.settings.intervalOptions.5'),
              interval15: t('sync.settings.intervalOptions.15'),
              interval30: t('sync.settings.intervalOptions.30'),
              interval60: t('sync.settings.intervalOptions.60'),
              conflictAsk: t('sync.settings.conflictOptions.ask'),
              conflictLocalWins: t('sync.settings.conflictOptions.localWins'),
              conflictRemoteWins: t('sync.settings.conflictOptions.remoteWins'),
              conflictNewestWins: t('sync.settings.conflictOptions.newestWins'),
            },
            progress: {
              connecting: t('sync.progress.connecting'),
              analyzing: t('sync.progress.analyzing'),
              checking: t('sync.progress.checking'),
              comparing: t('sync.progress.comparing'),
              uploading: t('sync.progress.uploading'),
              downloading: t('sync.progress.downloading'),
              finalizing: t('sync.progress.finalizing'),
              complete: t('sync.progress.complete'),
              projects: t('sync.progress.projects'),
              characters: t('sync.progress.characters'),
              images: t('sync.progress.images'),
              files: t('sync.progress.files'),
            },
          }}
        />

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

      {/* Sync Conflict Dialog */}
      <ConflictDialog
        open={sync.pendingConflicts.length > 0}
        conflicts={sync.pendingConflicts}
        onResolve={sync.resolveConflicts}
        onCancel={sync.cancelConflicts}
        labels={{
          title: t('sync.conflict.title'),
          description: t('sync.conflict.description'),
          localVersion: t('sync.conflict.local'),
          remoteVersion: t('sync.conflict.remote'),
          device: 'Device',
          modified: t('sync.conflict.modified'),
          keepLocal: t('sync.conflict.resolution.keepLocal'),
          keepRemote: t('sync.conflict.resolution.keepRemote'),
          skip: t('sync.conflict.resolution.skip'),
          resolveAll: t('sync.conflict.apply'),
          cancel: t('sync.conflict.cancel'),
          keepAllLocal: t('sync.conflict.resolution.keepLocal'),
          keepAllRemote: t('sync.conflict.resolution.keepRemote'),
          keepNewest: 'Keep Newest',
        }}
      />
    </div>
  );
}
