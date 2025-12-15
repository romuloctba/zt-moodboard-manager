'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Cloud, CloudOff, Check, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncContext } from '@/components/providers';
import { cn } from '@/lib/utils';
import { ConflictDialog } from './ConflictDialog';
import Link from 'next/link';

// Simple external store for success state (avoids lint issues with setState in effects)
let showSuccessState = false;
let successListeners: Array<() => void> = [];
let successTimeout: NodeJS.Timeout | null = null;

function setSuccessState(value: boolean) {
  showSuccessState = value;
  successListeners.forEach(listener => listener());
}

function subscribeToSuccess(callback: () => void) {
  successListeners.push(callback);
  return () => {
    successListeners = successListeners.filter(l => l !== callback);
  };
}

function getSuccessSnapshot() {
  return showSuccessState;
}

/**
 * Global sync status indicator that appears on all pages
 * Shows current sync status with visual feedback
 * Includes conflict resolution dialog when conflicts are detected
 */
export function GlobalSyncIndicator() {
  const { isConnected, isSyncing, syncStatus, lastResult, pendingConflicts, resolveConflicts } = useSyncContext();
  const t = useTranslations('sync');
  const prevSyncingRef = useRef(isSyncing);
  
  // Track which set of conflicts has been dismissed (by their IDs)
  // When a new set of conflicts arrives, the dialog will auto-show
  const [dismissedConflictKey, setDismissedConflictKey] = useState<string | null>(null);
  
  // Generate a stable key from current conflicts
  const currentConflictKey = pendingConflicts.length > 0 
    ? pendingConflicts.map(c => c.id).sort().join(',')
    : null;
  
  // Dialog shows if there are conflicts AND they haven't been dismissed
  const hasConflicts = pendingConflicts.length > 0;
  const showConflictDialog = currentConflictKey !== null && currentConflictKey !== dismissedConflictKey;
  
  // Use external store for success state to avoid lint issues
  const showSuccess = useSyncExternalStore(subscribeToSuccess, getSuccessSnapshot, getSuccessSnapshot);

  // Track sync completion to show success state
  useEffect(() => {
    // Detect when syncing transitions from true to false (sync completed)
    if (prevSyncingRef.current && !isSyncing && lastResult?.success) {
      // Clear any existing timer
      if (successTimeout) {
        clearTimeout(successTimeout);
      }
      
      setSuccessState(true);
      
      // Hide success after 2 seconds
      successTimeout = setTimeout(() => {
        setSuccessState(false);
      }, 2000);
    }
    
    prevSyncingRef.current = isSyncing;
    
    return () => {
      if (successTimeout) {
        clearTimeout(successTimeout);
      }
    };
  }, [isSyncing, lastResult?.success]);

  // Don't render if not connected
  if (!isConnected) {
    return null;
  }

  // Determine what to show
  const showSyncing = isSyncing;
  const showConflicts = hasConflicts;
  const showError = syncStatus === 'error' && !isSyncing && !showSuccess && !showConflicts;

  // Hide completely when idle and nothing to show
  if (!showSyncing && !showSuccess && !showError && !showConflicts) {
    return null;
  }

  const handleConflictClick = () => {
    if (hasConflicts) {
      // Re-open the dialog by clearing the dismissed key
      setDismissedConflictKey(null);
    }
  };

  const handleResolve = (resolved: typeof pendingConflicts) => {
    resolveConflicts(resolved);
    // No need to update dismissed key - conflicts will be cleared by resolveConflicts
  };

  const handleCancel = () => {
    // User dismissed without resolving - mark this set of conflicts as dismissed
    setDismissedConflictKey(currentConflictKey);
  };

  return (
    <>
      <div
        onClick={handleConflictClick}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all duration-300',
          'bg-background/95 backdrop-blur-sm border',
          showSyncing && 'border-blue-500/50 bg-blue-500/10',
          showSuccess && 'border-green-500/50 bg-green-500/10',
          showConflicts && 'border-amber-500/50 bg-amber-500/10 cursor-pointer hover:bg-amber-500/20',
          showError && 'border-red-500/50 bg-red-500/10'
        )}
        role={showConflicts ? 'button' : undefined}
        tabIndex={showConflicts ? 0 : undefined}
        onKeyDown={showConflicts ? (e) => e.key === 'Enter' && handleConflictClick() : undefined}
      >
        {showSyncing && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-blue-500">{t('indicator.syncing')}</span>
          </>
        )}
        
        {showSuccess && !showSyncing && !showConflicts && (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">{t('indicator.synced')}</span>
          </>
        )}
        
        {showConflicts && !showSyncing && (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">
              {t('indicator.conflicts', { count: pendingConflicts.length })}
            </span>
          </>
        )}
        
        {showError && (
          <Link href="/settings/sync">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">{t('indicator.failed')}</span>
          </Link>
        )}
      </div>

      {/* Global Conflict Resolution Dialog */}
      <ConflictDialog
        open={showConflictDialog && pendingConflicts.length > 0}
        conflicts={pendingConflicts}
        onResolve={handleResolve}
        onCancel={handleCancel}
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
    </>
  );
}

/**
 * Small sync status icon for headers/toolbars
 * Shows connection and sync status in a compact form
 */
export function SyncStatusIcon({ className }: { className?: string }) {
  const { isConnected, isSyncing, syncStatus, pendingConflicts } = useSyncContext();

  if (!isConnected) {
    return (
      <CloudOff 
        className={cn('h-4 w-4 text-muted-foreground/50', className)} 
        aria-label="Not connected to sync"
      />
    );
  }

  if (isSyncing) {
    return (
      <Loader2 
        className={cn('h-4 w-4 animate-spin text-blue-500', className)} 
        aria-label="Syncing"
      />
    );
  }

  if (pendingConflicts.length > 0) {
    return (
      <AlertTriangle 
        className={cn('h-4 w-4 text-amber-500', className)} 
        aria-label="Sync conflicts"
      />
    );
  }

  if (syncStatus === 'error') {
    return (
      <AlertCircle 
        className={cn('h-4 w-4 text-red-500', className)} 
        aria-label="Sync error"
      />
    );
  }

  return (
    <Cloud 
      className={cn('h-4 w-4 text-green-500', className)} 
      aria-label="Connected and synced"
    />
  );
}
