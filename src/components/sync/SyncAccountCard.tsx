'use client';

import { User, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SyncAccountCardProps {
  email: string;
  lastSyncAt?: Date | null;
  isSyncing?: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  className?: string;
  // i18n
  labels: {
    connectedAs: string;
    lastSync: string;
    never: string;
    syncNow: string;
    syncing: string;
    disconnect: string;
  };
}

/**
 * Shows connected account info with sync/disconnect actions
 */
export function SyncAccountCard({
  email,
  lastSyncAt,
  isSyncing,
  onSync,
  onDisconnect,
  className,
  labels,
}: SyncAccountCardProps) {
  const formatLastSync = () => {
    if (!lastSyncAt) return labels.never;
    return lastSyncAt.toLocaleString();
  };
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Account Info */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{labels.connectedAs}</p>
          <p className="font-medium truncate">{email}</p>
        </div>
      </div>
      
      {/* Last Sync Info */}
      <div className="text-sm text-muted-foreground">
        <span>{labels.lastSync}: </span>
        <span className="font-medium text-foreground">{formatLastSync()}</span>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={onSync}
          disabled={isSyncing}
          className="flex-1"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
          {isSyncing ? labels.syncing : labels.syncNow}
        </Button>
        
        <Button
          variant="outline"
          onClick={onDisconnect}
          disabled={isSyncing}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {labels.disconnect}
        </Button>
      </div>
    </div>
  );
}
