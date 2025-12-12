'use client';

import { useTranslations } from 'next-intl';
import { Header } from '@/components/layout';

// Sync Components
import {
  SyncSection,
  ConflictDialog,
} from '@/components/sync';

// Hooks
import { useSync, useAutoSync } from '@/hooks/useSync';

export default function SyncPage() {
  const t = useTranslations('sync');
  
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

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={t('title')}
        backHref={true}
      />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Cloud Sync Section */}
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
            title: t('section.title'),
            description: t('section.description'),
            notConnected: {
              title: t('connect.title'),
              description: t('connect.description'),
              button: t('connect.button'),
              connecting: t('status.connecting'),
              firstSyncNotice: t('connect.firstSyncNotice'),
            },
            account: {
              connectedAs: t('account.connectedAs'),
              lastSync: t('account.lastSync'),
              never: t('account.never'),
              syncNow: t('actions.syncNow'),
              syncing: t('status.syncing'),
              disconnect: t('account.disconnect'),
              firstSyncNotice: t('account.firstSyncNotice'),
            },
            settings: {
              autoSync: t('settings.autoSync'),
              autoSyncDescription: t('settings.autoSyncDescription'),
              syncInterval: t('settings.syncInterval'),
              syncOnStartup: t('settings.syncOnStartup'),
              syncOnStartupDescription: t('settings.syncOnStartupDescription'),
              conflictResolution: t('settings.conflictStrategy'),
              conflictResolutionDescription: t('settings.conflictStrategyDescription'),
              interval5: t('settings.intervalOptions.5'),
              interval15: t('settings.intervalOptions.15'),
              interval30: t('settings.intervalOptions.30'),
              interval60: t('settings.intervalOptions.60'),
              conflictAsk: t('settings.conflictOptions.ask'),
              conflictLocalWins: t('settings.conflictOptions.localWins'),
              conflictRemoteWins: t('settings.conflictOptions.remoteWins'),
              conflictNewestWins: t('settings.conflictOptions.newestWins'),
            },
            progress: {
              connecting: t('progress.connecting'),
              analyzing: t('progress.analyzing'),
              checking: t('progress.checking'),
              comparing: t('progress.comparing'),
              uploading: t('progress.uploading'),
              downloading: t('progress.downloading'),
              finalizing: t('progress.finalizing'),
              complete: t('progress.complete'),
              projects: t('progress.projects'),
              characters: t('progress.characters'),
              images: t('progress.images'),
              files: t('progress.files'),
            },
          }}
        />
      </main>

      {/* Sync Conflict Dialog */}
      <ConflictDialog
        open={sync.pendingConflicts.length > 0}
        conflicts={sync.pendingConflicts}
        onResolve={sync.resolveConflicts}
        onCancel={sync.cancelConflicts}
        labels={{
          title: t('conflict.title'),
          description: t('conflict.description'),
          localVersion: t('conflict.local'),
          remoteVersion: t('conflict.remote'),
          device: 'Device',
          modified: t('conflict.modified'),
          keepLocal: t('conflict.resolution.keepLocal'),
          keepRemote: t('conflict.resolution.keepRemote'),
          skip: t('conflict.resolution.skip'),
          resolveAll: t('conflict.apply'),
          cancel: t('conflict.cancel'),
          keepAllLocal: t('conflict.resolution.keepLocal'),
          keepAllRemote: t('conflict.resolution.keepRemote'),
          keepNewest: t('conflict.resolution.keepNewest'),
        }}
      />
    </div>
  );
}
