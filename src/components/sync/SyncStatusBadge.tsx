'use client';

import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SyncStatus } from '@/lib/sync/types';

export interface SyncStatusBadgeProps {
  status: SyncStatus;
  lastSyncAt?: Date | null;
  onClick?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<SyncStatus, {
  icon: typeof Cloud;
  color: string;
  bgColor: string;
  animate?: boolean;
  label: string;
}> = {
  idle: {
    icon: Cloud,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    label: 'Synced',
  },
  connecting: {
    icon: RefreshCw,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    animate: true,
    label: 'Connecting...',
  },
  checking: {
    icon: RefreshCw,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    animate: true,
    label: 'Checking...',
  },
  uploading: {
    icon: RefreshCw,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    animate: true,
    label: 'Uploading...',
  },
  downloading: {
    icon: RefreshCw,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    animate: true,
    label: 'Downloading...',
  },
  merging: {
    icon: RefreshCw,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    animate: true,
    label: 'Merging...',
  },
  success: {
    icon: Check,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Synced!',
  },
  error: {
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Sync Error',
  },
  offline: {
    icon: CloudOff,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    label: 'Offline',
  },
};

/**
 * A small badge/indicator showing sync status
 * Typically displayed in the app header
 */
export function SyncStatusBadge({
  status,
  lastSyncAt,
  onClick,
  className,
}: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  const formatLastSync = () => {
    if (!lastSyncAt) return 'Never synced';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
              config.bgColor,
              onClick && 'hover:opacity-80 cursor-pointer',
              className
            )}
          >
            <Icon 
              className={cn(
                'h-3.5 w-3.5',
                config.color,
                config.animate && 'animate-spin'
              )} 
            />
            <span className={cn('text-xs font-medium', config.color)}>
              {config.label}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">
            {status === 'idle' || status === 'success' ? (
              <>Last sync: {formatLastSync()}</>
            ) : (
              config.label
            )}
          </p>
          {onClick && (
            <p className="text-xs text-muted-foreground">Click to sync now</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version for tight spaces
 */
export function SyncStatusIcon({
  status,
  className,
}: {
  status: SyncStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <Icon 
      className={cn(
        'h-4 w-4',
        config.color,
        config.animate && 'animate-spin',
        className
      )} 
    />
  );
}
