/**
 * Sync Module Index
 * 
 * Public exports for the sync functionality.
 */

// Types
export * from './types';

// Services
export { googleAuth } from './googleAuth';
export { googleDrive } from './googleDriveService';
export { syncManifest } from './syncManifest';
export { syncService } from './syncService';

// Global sync trigger (for non-React contexts)
export { triggerGlobalSync, registerSyncTrigger, unregisterSyncTrigger } from './globalSyncTrigger';

// Utilities
export { getDeviceId, getDeviceName } from './deviceId';
export { hashObject, hashFile } from './hash';
