'use client';

import { Cloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncAccountCard } from './SyncAccountCard';
import { SyncSettingsCard } from './SyncSettingsCard';
import { SyncProgressIndicator, type SyncProgressLabels } from './SyncProgressIndicator';
import type { SyncSettings, SyncProgress, SyncInterval, ConflictStrategy } from '@/lib/sync/types';

export interface SyncSectionProps {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  
  // Settings
  settings: SyncSettings | null;
  
  // Progress
  progress: SyncProgress | null;
  
  // Handlers
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  onSettingsChange: (settings: Partial<SyncSettings>) => void;
  
  // i18n labels
  labels: {
    title: string;
    description: string;
    notConnected: {
      title: string;
      description: string;
      button: string;
      connecting: string;
      firstSyncNotice: string;
    };
    account: {
      connectedAs: string;
      lastSync: string;
      never: string;
      syncNow: string;
      syncing: string;
      disconnect: string;
      firstSyncNotice: string;
    };
    settings: {
      autoSync: string;
      autoSyncDescription: string;
      syncInterval: string;
      syncOnStartup: string;
      syncOnStartupDescription: string;
      conflictResolution: string;
      conflictResolutionDescription: string;
      interval5: string;
      interval15: string;
      interval30: string;
      interval60: string;
      conflictAsk: string;
      conflictLocalWins: string;
      conflictRemoteWins: string;
      conflictNewestWins: string;
    };
    progress: SyncProgressLabels;
  };
}

/**
 * Main sync settings section for the Settings page
 * Composes dumb components and passes data/handlers from hooks
 */
export function SyncSection({
  isConnected,
  isConnecting,
  isSyncing,
  settings,
  progress,
  onConnect,
  onDisconnect,
  onSync,
  onSettingsChange,
  labels,
}: SyncSectionProps) {
  const isLoading = isConnecting || isSyncing;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          {labels.title}
        </CardTitle>
        <CardDescription>
          {labels.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Not Connected State */}
        {!isConnected && (
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Cloud className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">{labels.notConnected.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {labels.notConnected.description}
            </p>
            <Button onClick={onConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {labels.notConnected.connecting}
                </>
              ) : (
                <>
                  <GoogleIcon className="w-4 h-4 mr-2" />
                  {labels.notConnected.button}
                </>
              )}
            </Button>
            <div>
              <p className="mt-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-4 text-sm text-blue-800 dark:text-blue-300">
                💡 {labels.notConnected.firstSyncNotice}
              </p>
            </div>
          </div>
        )}
        
        {/* Connected State */}
        {isConnected && settings && (
          <>
            {/* Account Card */}
            <SyncAccountCard
              email={settings.googleEmail || ''}
              lastSyncAt={settings.lastSyncAt ? new Date(settings.lastSyncAt) : null}
              isSyncing={isSyncing}
              onSync={onSync}
              onDisconnect={onDisconnect}
              labels={labels.account}
            />
            
            {/* First Sync Notice */}
            {!settings.lastSyncAt && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                💡 {labels.account.firstSyncNotice}
              </div>
            )}
            
            {/* Progress */}
            {isSyncing && progress && (
              <SyncProgressIndicator progress={progress} labels={labels.progress} />
            )}
            
            {/* Settings */}
            <div className="pt-4 border-t">
              <SyncSettingsCard
                autoSyncEnabled={settings.autoSyncEnabled}
                syncInterval={settings.syncIntervalMinutes}
                syncOnStartup={settings.syncOnStartup}
                conflictStrategy={settings.conflictStrategy}
                onAutoSyncChange={(enabled) => onSettingsChange({ autoSyncEnabled: enabled })}
                onIntervalChange={(interval: SyncInterval) => onSettingsChange({ syncIntervalMinutes: interval })}
                onStartupChange={(enabled) => onSettingsChange({ syncOnStartup: enabled })}
                onConflictStrategyChange={(strategy: ConflictStrategy) => onSettingsChange({ conflictStrategy: strategy })}
                disabled={isLoading}
                labels={labels.settings}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple Google icon component
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
