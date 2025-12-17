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
import { toast } from 'sonner';
import { syncService } from '@/lib/sync/syncService';
import { registerSyncTrigger, unregisterSyncTrigger } from '@/lib/sync/globalSyncTrigger';
import { SYNC_CONSTANTS } from '@/lib/sync/types';
import type {
  SyncSettings,
  SyncProgress,
  SyncResult,
  SyncStatus,
  SyncConflict,
  SyncTriggerSource,
} from '@/lib/sync/types';

// ===========================================
// Last Sync Timestamp Utilities
// ===========================================

/**
 * Save the timestamp of the last successful sync to localStorage
 * Called whenever any type of sync completes successfully
 */
function saveLastSyncTimestamp(): void {
  try {
    localStorage.setItem(SYNC_CONSTANTS.LAST_SYNC_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('[SyncProvider] Failed to save last sync timestamp:', error);
  }
}

/**
 * Get the timestamp of the last successful sync from localStorage
 * @returns The timestamp in milliseconds, or 0 if not set
 */
function getLastSyncTimestamp(): number {
  try {
    const stored = localStorage.getItem(SYNC_CONSTANTS.LAST_SYNC_TIMESTAMP_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('[SyncProvider] Failed to get last sync timestamp:', error);
    return 0;
  }
}

/**
 * Check if enough time has passed since the last sync
 * @returns true if enough time has passed, false if sync should be skipped
 */
function hasEnoughTimeSinceLastSync(): boolean {
  const lastSync = getLastSyncTimestamp();
  if (lastSync === 0) return true; // No previous sync, allow it
  
  const timeSinceLastSync = Date.now() - lastSync;
  return timeSinceLastSync >= SYNC_CONSTANTS.MIN_TIME_SINCE_LAST_SYNC_MS;
}

interface SyncContextValue {
  // State
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  hasPendingSync: boolean;
  syncStatus: SyncStatus;
  settings: SyncSettings | null;
  progress: SyncProgress | null;
  lastResult: SyncResult | null;
  lastError: string | null;
  pendingConflicts: SyncConflict[];
  conflictTimeoutSeconds: number | null;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sync: (options?: { force?: boolean; source?: SyncTriggerSource }) => Promise<SyncResult>;
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
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[]>([]);
  const [conflictTimeoutSeconds, setConflictTimeoutSeconds] = useState<number | null>(null);

  // Refs
  const conflictResolveRef = useRef<((conflicts: SyncConflict[]) => void) | null>(null);
  const conflictTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const conflictCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const debounceSyncRef = useRef<NodeJS.Timeout | null>(null);
  const hasRunStartupSync = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilitySyncRef = useRef(0);
  const syncRef = useRef<(options?: { force?: boolean; source?: SyncTriggerSource }) => Promise<SyncResult>>(null!);
  const pendingSyncSourceRef = useRef<SyncTriggerSource | null>(null);

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
   * @param options.force - Force sync even if recently synced
   * @param options.source - What triggered the sync (for logging/analytics)
   */
  const sync = useCallback(async (options?: { force?: boolean; source?: SyncTriggerSource }): Promise<SyncResult> => {
    const source = options?.source || 'manual';
    
    // Check if offline
    if (!navigator.onLine) {
      console.log('[SyncProvider] Sync blocked: offline', { source });
      setHasPendingSync(true);
      pendingSyncSourceRef.current = source;
      setSyncStatus('offline');
      toast.warning('You\'re offline. Changes will sync when back online.');
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
        errors: [{ type: 'network', message: 'Device is offline' }],
      };
    }

    if (isSyncing) {
      console.log('[SyncProvider] Sync blocked: already in progress', { source });
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

    console.log('[SyncProvider] Starting sync', { 
      source, 
      force: options?.force,
      timestamp: new Date().toISOString() 
    });

    setIsSyncing(true);
    setProgress(null);
    setHasPendingSync(false);
    pendingSyncSourceRef.current = null;

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
            
            // Start conflict timeout countdown
            const timeoutSeconds = Math.floor(SYNC_CONSTANTS.CONFLICT_TIMEOUT_MS / 1000);
            setConflictTimeoutSeconds(timeoutSeconds);

            // Wait for resolution with timeout
            return new Promise((resolve) => {
              conflictResolveRef.current = resolve;
              
              // Countdown interval
              let remaining = timeoutSeconds;
              conflictCountdownRef.current = setInterval(() => {
                remaining -= 1;
                setConflictTimeoutSeconds(remaining);
              }, 1000);
              
              // Auto-resolve after timeout
              conflictTimeoutRef.current = setTimeout(() => {
                if (conflictResolveRef.current) {
                  console.warn('[SyncProvider] Conflict resolution timed out, auto-skipping...');
                  const autoResolved = conflicts.map(c => ({
                    ...c,
                    resolution: 'skip' as const,
                  }));
                  resolve(autoResolved);
                  conflictResolveRef.current = null;
                  setPendingConflicts([]);
                  setConflictTimeoutSeconds(null);
                  toast.info('Conflicts auto-skipped after timeout');
                  
                  // Cleanup countdown
                  if (conflictCountdownRef.current) {
                    clearInterval(conflictCountdownRef.current);
                    conflictCountdownRef.current = null;
                  }
                }
              }, SYNC_CONSTANTS.CONFLICT_TIMEOUT_MS);
            });
          }
        : undefined,
    });

    setLastResult(result);
    setSettings(syncService.getSyncSettings());

    if (result.success) {
      // Save the timestamp of this successful sync (for all sync types)
      saveLastSyncTimestamp();
      
      setSyncStatus('success');
      setLastError(null);
      
      // Show toast for successful sync (only for manual syncs or when there were changes)
      if (source === 'manual' || result.direction !== 'none') {
        const totalItems = Object.values(result.itemsSynced).reduce(
          (sum, counts) => sum + counts.added + counts.updated + counts.deleted, 
          0
        );
        if (totalItems > 0) {
          toast.success('Sync complete!', {
            description: `${totalItems} item${totalItems !== 1 ? 's' : ''} synced`,
          });
        } else if (source === 'manual') {
          toast.success('Everything up to date');
        }
      }
      
      // Reset to idle after a delay
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
      // Extract error message from result
      const errorMsg = result.errors?.[0]?.message || 'Unknown sync error';
      setLastError(errorMsg);
      console.error('[SyncProvider] Sync error:', errorMsg, { source });
      
      // Show error toast (always show for manual, sometimes for auto)
      if (source === 'manual') {
        toast.error('Sync failed', {
          description: errorMsg,
          action: {
            label: 'Retry',
            onClick: () => sync({ force: true, source: 'manual' }),
          },
        });
      }
    }

    setIsSyncing(false);
    setProgress(null);

    return result;
  }, [isSyncing, settings?.conflictStrategy]);

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
    // Clear timeout and countdown
    if (conflictTimeoutRef.current) {
      clearTimeout(conflictTimeoutRef.current);
      conflictTimeoutRef.current = null;
    }
    if (conflictCountdownRef.current) {
      clearInterval(conflictCountdownRef.current);
      conflictCountdownRef.current = null;
    }
    setConflictTimeoutSeconds(null);
    
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
    // Clear timeout and countdown
    if (conflictTimeoutRef.current) {
      clearTimeout(conflictTimeoutRef.current);
      conflictTimeoutRef.current = null;
    }
    if (conflictCountdownRef.current) {
      clearInterval(conflictCountdownRef.current);
      conflictCountdownRef.current = null;
    }
    setConflictTimeoutSeconds(null);
    
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

    // If offline, mark as pending
    if (!navigator.onLine) {
      setHasPendingSync(true);
      pendingSyncSourceRef.current = 'data-change';
      return;
    }

    // Clear existing debounce
    if (debounceSyncRef.current) {
      clearTimeout(debounceSyncRef.current);
    }

    // Set new debounce
    debounceSyncRef.current = setTimeout(() => {
      syncRef.current({ force: false, source: 'data-change' });
    }, SYNC_CONSTANTS.SYNC_DEBOUNCE_MS);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceSyncRef.current) {
        clearTimeout(debounceSyncRef.current);
      }
      if (conflictTimeoutRef.current) {
        clearTimeout(conflictTimeoutRef.current);
      }
      if (conflictCountdownRef.current) {
        clearInterval(conflictCountdownRef.current);
      }
    };
  }, []);

  // Online/offline event handling
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SyncProvider] Back online');
      setIsOnline(true);
      setSyncStatus('idle');
      
      // If there's a pending sync, trigger it after a short delay
      if (hasPendingSync && settings?.autoSyncEnabled) {
        setTimeout(() => {
          // Check if enough time has passed since the last sync
          // This prevents redundant syncs if we just synced before going offline
          // or during reconnect storms with flaky network
          if (!hasEnoughTimeSinceLastSync()) {
            const timeSinceLastSync = Date.now() - getLastSyncTimestamp();
            console.log('[SyncProvider] Skipping online-recovery sync: last sync was too recent', {
              timeSinceLastSync,
              minRequired: SYNC_CONSTANTS.MIN_TIME_SINCE_LAST_SYNC_MS,
            });
            // Clear the pending sync flag since we're intentionally skipping
            setHasPendingSync(false);
            pendingSyncSourceRef.current = null;
            return;
          }
          
          toast.info('Back online! Syncing...');
          const source = pendingSyncSourceRef.current || 'online-recovery';
          syncRef.current({ force: false, source });
        }, SYNC_CONSTANTS.ONLINE_SYNC_DELAY_MS);
      }
    };
    
    const handleOffline = () => {
      console.log('[SyncProvider] Went offline');
      setIsOnline(false);
      setSyncStatus('offline');
      
      // Mark any pending debounced sync as pending
      if (debounceSyncRef.current) {
        clearTimeout(debounceSyncRef.current);
        debounceSyncRef.current = null;
        setHasPendingSync(true);
        pendingSyncSourceRef.current = 'data-change';
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasPendingSync, settings?.autoSyncEnabled]);

  // Register global sync trigger for non-React contexts (like Zustand stores)
  useEffect(() => {
    registerSyncTrigger(triggerSync);
    return () => {
      unregisterSyncTrigger();
    };
  }, [triggerSync]);

  // Auto-sync: Startup sync
  useEffect(() => {
    // Check flag FIRST before doing anything else
    if (hasRunStartupSync.current) {
      return;
    }

    const currentSettings = settings;
    if (
      !currentSettings?.enabled ||
      !currentSettings?.autoSyncEnabled ||
      !currentSettings?.syncOnStartup ||
      !isConnected
    ) {
      return;
    }

    // Mark as run BEFORE scheduling to prevent race conditions
    hasRunStartupSync.current = true;

    // Delay startup sync slightly
    const timeout = setTimeout(() => {
      // Also update visibility ref to prevent duplicate sync from visibility handler
      lastVisibilitySyncRef.current = Date.now();
      syncRef.current({ force: false, source: 'startup' });
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
      // Don't sync if offline
      if (navigator.onLine) {
        syncRef.current({ force: false, source: 'interval' });
      }
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

        // Debounce: only sync if enough time has passed and we're online
        if (timeSinceLastSync >= SYNC_CONSTANTS.VISIBILITY_SYNC_DEBOUNCE_MS && navigator.onLine) {
          lastVisibilitySyncRef.current = now;
          syncRef.current({ force: false, source: 'visibility' });
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
    isOnline,
    hasPendingSync,
    syncStatus,
    settings,
    progress,
    lastResult,
    lastError,
    pendingConflicts,
    conflictTimeoutSeconds,
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
