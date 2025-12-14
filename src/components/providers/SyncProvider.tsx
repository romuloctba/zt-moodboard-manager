'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { syncService } from '@/lib/sync/syncService';
import { registerSyncTrigger, unregisterSyncTrigger } from '@/lib/sync/globalSyncTrigger';
import { SYNC_CONSTANTS } from '@/lib/sync/types';
import type {
  SyncSettings,
  SyncProgress,
  SyncResult,
  SyncStatus,
  SyncConflict,
} from '@/lib/sync/types';

// Debounce time for sync after data changes (ms)
const SYNC_DEBOUNCE_MS = 5000; // 5 seconds after last change

interface SyncContextValue {
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

  // Trigger sync on data change (debounced)
  triggerSync: () => void;
  
  // For checking changes
  checkForChanges: () => Promise<{ hasChanges: boolean; direction?: 'push' | 'pull' | 'merge' }>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  // State
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[]>([]);

  // Refs
  const conflictResolveRef = useRef<((conflicts: SyncConflict[]) => void) | null>(null);
  const debounceSyncRef = useRef<NodeJS.Timeout | null>(null);
  const hasRunStartupSync = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilitySyncRef = useRef(0);
  const syncRef = useRef<(options?: { force?: boolean }) => Promise<SyncResult>>(null!);

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
      console.error('[SyncProvider] Connect error:', error);
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
        },
        errors: [{ type: 'unknown', message: 'Sync already in progress' }],
      };
    }

    setIsSyncing(true);
    setProgress(null);

    // Only provide onConflict callback if the strategy is 'ask'
    // Otherwise, let syncService auto-resolve based on the configured strategy
    const shouldAskForConflicts = settings?.conflictStrategy === 'ask';

    const result = await syncService.performSync({
      force: options?.force,
      onProgress: (p) => {
        setProgress(p);
        setSyncStatus(p.status);
      },
      onConflict: shouldAskForConflicts 
        ? async (conflicts) => {
            // Show conflicts to user
            setPendingConflicts(conflicts);

            // Wait for resolution
            return new Promise((resolve) => {
              conflictResolveRef.current = resolve;
            });
          }
        : undefined,
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

  // Keep sync ref updated
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

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

  /**
   * Trigger a debounced sync (called when data changes)
   */
  const triggerSync = useCallback(() => {
    // Only trigger if connected and auto-sync is enabled
    const currentSettings = syncService.getSyncSettings();
    if (!currentSettings?.enabled || !currentSettings?.autoSyncEnabled) {
      return;
    }

    // Clear existing debounce
    if (debounceSyncRef.current) {
      clearTimeout(debounceSyncRef.current);
    }

    // Set new debounce
    debounceSyncRef.current = setTimeout(() => {
      syncRef.current({ force: false });
    }, SYNC_DEBOUNCE_MS);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceSyncRef.current) {
        clearTimeout(debounceSyncRef.current);
      }
    };
  }, []);

  // Register global sync trigger for non-React contexts (like Zustand stores)
  useEffect(() => {
    registerSyncTrigger(triggerSync);
    return () => {
      unregisterSyncTrigger();
    };
  }, [triggerSync]);

  // Auto-sync: Startup sync
  useEffect(() => {
    const currentSettings = settings;
    if (
      !currentSettings?.enabled ||
      !currentSettings?.autoSyncEnabled ||
      !currentSettings?.syncOnStartup ||
      hasRunStartupSync.current ||
      !isConnected
    ) {
      return;
    }

    hasRunStartupSync.current = true;

    // Delay startup sync slightly
    const timeout = setTimeout(() => {
      syncRef.current({ force: false });
    }, SYNC_CONSTANTS.STARTUP_SYNC_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [settings, isConnected]);

  // Auto-sync: Interval sync
  useEffect(() => {
    const currentSettings = settings;
    if (
      !currentSettings?.enabled ||
      !currentSettings?.autoSyncEnabled ||
      !isConnected ||
      (currentSettings?.syncIntervalMinutes ?? 0) <= 0
    ) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      syncRef.current({ force: false });
    }, currentSettings.syncIntervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [settings, isConnected]);

  // Auto-sync: Visibility-based sync (when tab becomes visible)
  useEffect(() => {
    const currentSettings = settings;
    if (!currentSettings?.enabled || !currentSettings?.autoSyncEnabled || !isConnected) {
      return;
    }

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
  }, [settings, isConnected]);

  // Auto-sync: Before page unload (best-effort sync)
  useEffect(() => {
    const currentSettings = settings;
    if (!currentSettings?.enabled || !currentSettings?.autoSyncEnabled || !isConnected) {
      return;
    }

    const handleBeforeUnload = () => {
      // Cancel any pending debounced sync
      if (debounceSyncRef.current) {
        clearTimeout(debounceSyncRef.current);
        debounceSyncRef.current = null;
      }
      
      // Note: We can't reliably do async operations on beforeunload
      // The sync will happen on next app load via startup sync
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [settings, isConnected]);

  const value: SyncContextValue = {
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
    triggerSync,
    checkForChanges,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

/**
 * Hook to access sync context
 * @throws Error if used outside of SyncProvider
 */
export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}

/**
 * Hook to trigger sync on data changes (safe to use outside provider)
 * Returns a function that can be called to trigger a debounced sync
 */
export function useSyncTrigger(): () => void {
  const context = useContext(SyncContext);
  
  // Return no-op if context is not available (won't crash the app)
  if (!context) {
    return () => {};
  }
  
  return context.triggerSync;
}
