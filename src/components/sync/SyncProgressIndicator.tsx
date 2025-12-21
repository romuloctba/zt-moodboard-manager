'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SyncProgress as SyncProgressType } from '@/lib/sync/types';

export interface SyncProgressLabels {
  connecting: string;
  analyzing: string;
  checking: string;
  comparing: string;
  uploading: string;
  downloading: string;
  finalizing: string;
  complete: string;
  // Item types
  projects?: string;
  characters?: string;
  images?: string;
  files?: string;
}

export interface SyncProgressIndicatorProps {
  progress: SyncProgressType;
  labels: SyncProgressLabels;
  className?: string;
}

/**
 * Shows detailed sync progress with a progress bar
 */
export function SyncProgressIndicator({
  progress,
  labels,
  className,
}: SyncProgressIndicatorProps) {
  const percentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100)
    : 0;
  
  // Get translated phase text
  const phaseText = labels[progress.phase] || progress.phase;
  
  // Get item type if available
  const itemTypeText = progress.itemType 
    ? labels[progress.itemType as keyof SyncProgressLabels] || progress.itemType
    : null;
  
  // Combine phase with item type if available
  const displayText = itemTypeText 
    ? `${phaseText} ${itemTypeText}...`
    : `${phaseText}...`;
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{displayText}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
