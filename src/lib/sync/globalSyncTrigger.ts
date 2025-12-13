/**
 * Global Sync Trigger
 * 
 * This module provides a way to trigger sync from anywhere in the app,
 * including from Zustand stores and other non-React contexts.
 * 
 * The SyncProvider registers itself as the sync handler when mounted.
 */

type SyncTriggerFn = () => void;

let globalSyncTrigger: SyncTriggerFn | null = null;

/**
 * Register the sync trigger function (called by SyncProvider)
 */
export function registerSyncTrigger(trigger: SyncTriggerFn): void {
  globalSyncTrigger = trigger;
}

/**
 * Unregister the sync trigger function (called by SyncProvider on unmount)
 */
export function unregisterSyncTrigger(): void {
  globalSyncTrigger = null;
}

/**
 * Trigger a debounced sync from anywhere in the app
 * Safe to call even if SyncProvider is not mounted (will no-op)
 */
export function triggerGlobalSync(): void {
  if (globalSyncTrigger) {
    globalSyncTrigger();
  }
}
