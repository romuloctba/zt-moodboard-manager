'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Cloud, CloudOff, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useSyncContext } from '@/components/providers';
import { cn } from '@/lib/utils';

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
 */
export function GlobalSyncIndicator() {
  const { isConnected, isSyncing, syncStatus, lastResult } = useSyncContext();
  const prevSyncingRef = useRef(isSyncing);
  
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
  const showError = syncStatus === 'error' && !isSyncing && !showSuccess;

  // Hide completely when idle and nothing to show
  if (!showSyncing && !showSuccess && !showError) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all duration-300',
        'bg-background/95 backdrop-blur-sm border',
        showSyncing && 'border-blue-500/50 bg-blue-500/10',
        showSuccess && 'border-green-500/50 bg-green-500/10',
        showError && 'border-red-500/50 bg-red-500/10'
      )}
    >
      {showSyncing && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-sm font-medium text-blue-500">Syncing...</span>
        </>
      )}
      
      {showSuccess && !showSyncing && (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">Synced</span>
        </>
      )}
      
      {showError && (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-500">Sync failed</span>
        </>
      )}
    </div>
  );
}

/**
 * Small sync status icon for headers/toolbars
 * Shows connection and sync status in a compact form
 */
export function SyncStatusIcon({ className }: { className?: string }) {
  const { isConnected, isSyncing, syncStatus } = useSyncContext();

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
