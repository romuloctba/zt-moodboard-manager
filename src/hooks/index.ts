// UI State Hooks
export { useSelection, type UseSelectionReturn } from './useSelection';
export { useConfirmDialog, type UseConfirmDialogReturn } from './useConfirmDialog';

// Data Hooks
export { useImageData, type ImageWithUrl, type UseImageDataReturn } from './useImageData';
export { useImageActions, type UseImageActionsReturn } from './useImageActions';
export { useStorageStats, type StorageStats, type StorageEstimate } from './useStorageStats';
export { useBackupRestore, getProgressPercent } from './useBackupRestore';

// PWA Hooks
export { usePWAInstall, type UsePWAInstallReturn } from './usePWAInstall';

// Sync Hooks
export { useSync, useAutoSync } from './useSync';

// Utility Hooks
export { useIsMobile } from './use-mobile';
export { useNotFound } from './use-not-found';
