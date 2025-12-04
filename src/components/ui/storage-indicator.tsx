'use client';

import { useState, useEffect } from 'react';
import { HardDrive } from 'lucide-react';
import { fileStorage } from '@/lib/storage/fileStorage';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StorageIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function StorageIndicator({ className, showLabel = true }: StorageIndicatorProps) {
  const [storage, setStorage] = useState<{ used: number; quota: number; percentage: number } | null>(null);

  useEffect(() => {
    async function fetchStorage() {
      const estimate = await fileStorage.getStorageEstimate();
      setStorage(estimate);
    }
    fetchStorage();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStorage, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!storage) return null;

  const usedFormatted = fileStorage.formatBytes(storage.used);
  const quotaFormatted = fileStorage.formatBytes(storage.quota);
  const percentageFormatted = storage.percentage.toFixed(1);

  // Color based on usage
  const getProgressColor = () => {
    if (storage.percentage > 90) return 'bg-destructive';
    if (storage.percentage > 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            {showLabel && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', getProgressColor())}
                    style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {usedFormatted}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Storage Usage</p>
          <p className="text-xs text-muted-foreground">
            {usedFormatted} of {quotaFormatted} ({percentageFormatted}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
