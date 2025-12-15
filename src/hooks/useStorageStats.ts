'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDatabaseStats } from '@/lib/export/backupService';
import { fileStorage } from '@/lib/storage/fileStorage';

export interface StorageStats {
  projects: number;
  characters: number;
  images: number;
  editions: number;
  scriptPages: number;
  panels: number;
  storageUsed: string;
}

export interface StorageEstimate {
  used: number;
  quota: number;
  percentage: number;
}

interface UseStorageStatsReturn {
  stats: StorageStats | null;
  storageInfo: StorageEstimate | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  formatBytes: (bytes: number) => string;
}

/**
 * Hook for loading and managing storage statistics
 */
export function useStorageStats(): UseStorageStatsReturn {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dbStats, storage] = await Promise.all([
        getDatabaseStats(),
        fileStorage.getStorageEstimate(),
      ]);

      setStats(dbStats);
      setStorageInfo(storage);
    } catch (err) {
      console.error('Failed to load storage stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to load stats'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatBytes = useCallback((bytes: number) => {
    return fileStorage.formatBytes(bytes);
  }, []);

  return {
    stats,
    storageInfo,
    loading,
    error,
    refetch: loadStats,
    formatBytes,
  };
}
