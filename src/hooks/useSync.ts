'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { syncService } from '@/lib/sync/syncService';
import { SYNC_CONSTANTS } from '@/lib/sync/types';
import type {
  SyncSettings,
  SyncProgress,
  SyncResult,
  SyncStatus,
  SyncConflict,
} from '@/lib/sync/types';

interface UseSyncReturn {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  settings: SyncSettings | null;
  progress: SyncProgress | null;
  lastResult: SyncResult | null;
  pendingConflicts: SyncConflict[];

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sync: (options?: { force?: boolean }) => Promise<SyncResult>;
  updateSettings: (settings: Partial<SyncSettings>) => void;
  resolveConflicts: (resolvedConflicts: SyncConflict[]) => void;
  cancelConflicts: () => void;

  // For checking changes
  checkForChanges: () => Promise<{ hasChanges: boolean; direction?: 'push' | 'pull' | 'merge' }>;
}

/**
 * Main hook for sync functionality
 * Manages connection, sync operations, and settings
 */
export function useSync(): UseSyncReturn {
  // State
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[]>([]);

  // Refs for conflict resolution
  const conflictResolveRef = useRef<((conflicts: SyncConflict[]) => void) | null>(null);

  // Computed state
  const isConnected = settings?.enabled === true && settings?.provider === 'google-drive';

  // Initialize settings on mount
  useEffect(() => {
    let mounted = true;

    const loadedSettings = syncService.initializeSettings();
    if (!mounted) return;

    setSettings(loadedSettings);

    // Check if we're already connected
    if (loadedSettings.enabled && loadedSettings.provider === 'google-drive') {
      // Verify token is still valid
      import('@/lib/sync/googleAuth').then(({ googleAuth }) => {
        if (!mounted) return;

        if (!googleAuth.isSignedIn()) {
          // Token expired, clear settings
          syncService.saveSyncSettings({
            enabled: false,
            provider: 'none',
          });
          setSettings(syncService.getSyncSettings());
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Connect to Google Drive
   */
  const connect = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setSyncStatus('connecting');

    try {
      const result = await syncService.connect();

      if (result.success) {
        setSettings(syncService.getSyncSettings());
        setSyncStatus('idle');
        return true;
      } else {
        setSyncStatus('error');
        return false;
      }
    } catch (error) {
      console.error('[useSync] Connect error:', error);
      setSyncStatus('error');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect from Google Drive
   */
  const disconnect = useCallback(async (): Promise<void> => {
    await syncService.disconnect();
    setSettings(syncService.getSyncSettings());
    setSyncStatus('idle');
    setProgress(null);
    setLastResult(null);
  }, []);

  /**
   * Perform sync
   */
  const sync = useCallback(async (options?: { force?: boolean }): Promise<SyncResult> => {
    if (isSyncing) {
      return {
        success: false,
        direction: 'none',
        timestamp: new Date(),
        duration: 0,
        itemsSynced: {
          projects: { added: 0, updated: 0, deleted: 0 },
          characters: { added: 0, updated: 0, deleted: 0 },
          images: { added: 0, updated: 0, deleted: 0 },
          files: { added: 0, updated: 0, deleted: 0 },
          editions: { added: 0, updated: 0, deleted: 0 },
          scriptPages: { added: 0, updated: 0, deleted: 0 },
          panels: { added: 0, updated: 0, deleted: 0 },
        },
        errors: [{ type: 'unknown', message: 'Sync already in progress' }],
      };
    }

    setIsSyncing(true);
    setProgress(null);

    const result = await syncService.performSync({
      force: options?.force,
      onProgress: (p) => {
        setProgress(p);
        setSyncStatus(p.status);
      },
      onConflict: async (conflicts) => {
        // Show conflicts to user
        setPendingConflicts(conflicts);

        // Wait for resolution
        return new Promise((resolve) => {
          conflictResolveRef.current = resolve;
        });
      },
    });

    setLastResult(result);
    setSettings(syncService.getSyncSettings());

    if (result.success) {
      setSyncStatus('success');
      // Reset to idle after a delay
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
    }

    setIsSyncing(false);
    setProgress(null);

    return result;
  }, [isSyncing]);

  /**
   * Update settings
   */
  const updateSettings = useCallback((newSettings: Partial<SyncSettings>) => {
    const updated = syncService.saveSyncSettings(newSettings);
    setSettings(updated);
  }, []);

  /**
   * Resolve pending conflicts
   */
  const resolveConflicts = useCallback((resolvedConflicts: SyncConflict[]) => {
    if (conflictResolveRef.current) {
      conflictResolveRef.current(resolvedConflicts);
      conflictResolveRef.current = null;
    }
    setPendingConflicts([]);
  }, []);

  /**
   * Cancel conflict resolution (skip all)
   */
  const cancelConflicts = useCallback(() => {
    if (conflictResolveRef.current) {
      const skipped = pendingConflicts.map(c => ({ ...c, resolution: 'skip' as const }));
      conflictResolveRef.current(skipped);
      conflictResolveRef.current = null;
    }
    setPendingConflicts([]);
  }, [pendingConflicts]);

  /**
   * Check for changes without syncing
   */
  const checkForChanges = useCallback(async () => {
    return syncService.checkForChanges();
  }, []);

  return {
    isConnected,
    isConnecting,
    isSyncing,
    syncStatus,
    settings,
    progress,
    lastResult,
    pendingConflicts,
    connect,
    disconnect,
    sync,
    updateSettings,
    resolveConflicts,
    cancelConflicts,
    checkForChanges,
  };
}

/**
 * Hook for auto-sync functionality
 * Handles interval syncing, startup sync, and visibility-based sync
 */
export function useAutoSync(
  enabled: boolean,
  intervalMinutes: number,
  syncOnStartup: boolean,
  isConnected: boolean,
  sync: (options?: { force?: boolean }) => Promise<SyncResult>
) {
  const hasRunStartupSync = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilitySyncRef = useRef(0);

  // Use ref to store sync function to avoid dependency issues
  const syncRef = useRef(sync);
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  // Startup sync
  useEffect(() => {
    if (!enabled || !isConnected || !syncOnStartup || hasRunStartupSync.current) {
      return;
    }

    hasRunStartupSync.current = true;

    // Delay startup sync slightly
    const timeout = setTimeout(() => {
      syncRef.current({ force: false });
    }, SYNC_CONSTANTS.STARTUP_SYNC_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [enabled, isConnected, syncOnStartup]);

  // Interval sync
  useEffect(() => {
    if (!enabled || !isConnected || intervalMinutes <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      syncRef.current({ force: false });
    }, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isConnected, intervalMinutes]);

  // Visibility-based sync (when tab becomes visible)
  useEffect(() => {
    if (!enabled || !isConnected) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastSync = now - lastVisibilitySyncRef.current;

        // Debounce: only sync if enough time has passed
        if (timeSinceLastSync >= SYNC_CONSTANTS.VISIBILITY_SYNC_DEBOUNCE_MS) {
          lastVisibilitySyncRef.current = now;
          syncRef.current({ force: false });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, isConnected]);
}
