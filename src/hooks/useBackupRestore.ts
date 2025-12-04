'use client';

import { useState, useCallback, useRef } from 'react';
import {
  createFullBackup,
  restoreFromBackup,
  validateBackup,
  clearAllData,
  type BackupProgress,
  type RestoreProgress,
  type BackupManifest
} from '@/lib/export/backupService';

interface UseBackupRestoreReturn {
  // Backup
  isBackingUp: boolean;
  backupProgress: BackupProgress | null;
  createBackup: () => Promise<boolean>;

  // Restore
  isRestoring: boolean;
  restoreProgress: RestoreProgress | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<boolean>;
  pendingRestoreFile: File | null;
  pendingManifest: BackupManifest | null;
  confirmRestore: () => Promise<boolean>;
  cancelRestore: () => void;

  // Clear
  isClearing: boolean;
  clearData: () => Promise<{ filesDeleted: number } | null>;

  // Validation error
  validationError: string | null;
}interface UseBackupRestoreOptions {
  onBackupComplete?: () => void;
  onRestoreComplete?: () => void;
  onClearComplete?: (result: { filesDeleted: number }) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for managing backup, restore, and clear data operations
 */
export function useBackupRestore(options: UseBackupRestoreOptions = {}): UseBackupRestoreReturn {
  const { onBackupComplete, onRestoreComplete, onClearComplete, onError } = options;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);

  // Restore state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [pendingManifest, setPendingManifest] = useState<BackupManifest | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear state
  const [isClearing, setIsClearing] = useState(false);

  /** Create a full backup */
  const createBackup = useCallback(async (): Promise<boolean> => {
    setIsBackingUp(true);
    setBackupProgress(null);

    try {
      await createFullBackup((progress) => {
        setBackupProgress(progress);
      });
      onBackupComplete?.();
      return true;
    } catch (error) {
      console.error('Backup failed:', error);
      onError?.(error instanceof Error ? error : new Error('Backup failed'));
      return false;
    } finally {
      setIsBackingUp(false);
      setBackupProgress(null);
    }
  }, [onBackupComplete, onError]);

  /** Handle file selection for restore - returns true if validation passed */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<boolean> => {
    const file = e.target.files?.[0];
    if (!file) return false;

    // Reset input
    e.target.value = '';
    setValidationError(null);

    // Validate the backup
    const validation = await validateBackup(file);

    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid backup file');
      onError?.(new Error(validation.error || 'Invalid backup file'));
      return false;
    }

    // Store pending restore info
    setPendingRestoreFile(file);
    setPendingManifest(validation.manifest!);
    return true;
  }, [onError]);

  /** Confirm and execute restore */
  const confirmRestore = useCallback(async (): Promise<boolean> => {
    if (!pendingRestoreFile) return false;

    setIsRestoring(true);
    setRestoreProgress(null);

    try {
      await restoreFromBackup(pendingRestoreFile, (progress) => {
        setRestoreProgress(progress);
      });

      onRestoreComplete?.();
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      onError?.(error instanceof Error ? error : new Error('Restore failed'));
      return false;
    } finally {
      setIsRestoring(false);
      setRestoreProgress(null);
      setPendingRestoreFile(null);
      setPendingManifest(null);
    }
  }, [pendingRestoreFile, onRestoreComplete, onError]);

  /** Cancel pending restore */
  const cancelRestore = useCallback(() => {
    setPendingRestoreFile(null);
    setPendingManifest(null);
    setValidationError(null);
  }, []);

  /** Clear all data */
  const clearData = useCallback(async (): Promise<{ filesDeleted: number } | null> => {
    setIsClearing(true);

    try {
      const result = await clearAllData();
      onClearComplete?.(result);
      return result;
    } catch (error) {
      console.error('Clear data failed:', error);
      onError?.(error instanceof Error ? error : new Error('Clear data failed'));
      return null;
    } finally {
      setIsClearing(false);
    }
  }, [onClearComplete, onError]);

  return {
    // Backup
    isBackingUp,
    backupProgress,
    createBackup,

    // Restore
    isRestoring,
    restoreProgress,
    fileInputRef,
    handleFileSelect,
    pendingRestoreFile,
    pendingManifest,
    confirmRestore,
    cancelRestore,

    // Clear
    isClearing,
    clearData,

    // Validation
    validationError,
  };
}

/**
 * Helper function to calculate progress percentage
 */
export function getProgressPercent(progress: BackupProgress | RestoreProgress | null): number {
  if (!progress) return 0;
  if (progress.total === 0) return 0;
  return Math.round((progress.current / progress.total) * 100);
}
