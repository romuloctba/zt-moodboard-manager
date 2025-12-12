'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SyncInterval, ConflictStrategy } from '@/lib/sync/types';

export interface SyncSettingsCardProps {
  autoSyncEnabled: boolean;
  syncInterval: SyncInterval;
  syncOnStartup: boolean;
  conflictStrategy: ConflictStrategy;
  onAutoSyncChange: (enabled: boolean) => void;
  onIntervalChange: (interval: SyncInterval) => void;
  onStartupChange: (enabled: boolean) => void;
  onConflictStrategyChange: (strategy: ConflictStrategy) => void;
  disabled?: boolean;
  className?: string;
  // i18n
  labels: {
    autoSync: string;
    autoSyncDescription: string;
    syncInterval: string;
    syncOnStartup: string;
    syncOnStartupDescription: string;
    conflictResolution: string;
    conflictResolutionDescription: string;
    interval5: string;
    interval15: string;
    interval30: string;
    interval60: string;
    conflictAsk: string;
    conflictLocalWins: string;
    conflictRemoteWins: string;
    conflictNewestWins: string;
  };
}

/**
 * Sync settings form with toggles and selects
 */
export function SyncSettingsCard({
  autoSyncEnabled,
  syncInterval,
  syncOnStartup,
  conflictStrategy,
  onAutoSyncChange,
  onIntervalChange,
  onStartupChange,
  onConflictStrategyChange,
  disabled,
  className,
  labels,
}: SyncSettingsCardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Auto Sync Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-sync" className="text-base">
            {labels.autoSync}
          </Label>
          <p className="text-sm text-muted-foreground">
            {labels.autoSyncDescription}
          </p>
        </div>
        <Switch
          id="auto-sync"
          checked={autoSyncEnabled}
          onCheckedChange={onAutoSyncChange}
          disabled={disabled}
        />
      </div>
      
      {/* Sync Interval */}
      {autoSyncEnabled && (
        <div className="flex items-center justify-between">
          <Label htmlFor="sync-interval" className="text-base">
            {labels.syncInterval}
          </Label>
          <Select
            value={syncInterval.toString()}
            onValueChange={(v: string) => onIntervalChange(parseInt(v) as SyncInterval)}
            disabled={disabled}
          >
            <SelectTrigger id="sync-interval" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">{labels.interval5}</SelectItem>
              <SelectItem value="15">{labels.interval15}</SelectItem>
              <SelectItem value="30">{labels.interval30}</SelectItem>
              <SelectItem value="60">{labels.interval60}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Sync on Startup */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="sync-startup" className="text-base">
            {labels.syncOnStartup}
          </Label>
          <p className="text-sm text-muted-foreground">
            {labels.syncOnStartupDescription}
          </p>
        </div>
        <Switch
          id="sync-startup"
          checked={syncOnStartup}
          onCheckedChange={onStartupChange}
          disabled={disabled}
        />
      </div>
      
      {/* Conflict Resolution Strategy */}
      <div className="space-y-2">
        <div className="space-y-0.5">
          <Label htmlFor="conflict-strategy" className="text-base">
            {labels.conflictResolution}
          </Label>
          <p className="text-sm text-muted-foreground">
            {labels.conflictResolutionDescription}
          </p>
        </div>
        <Select
          value={conflictStrategy}
          onValueChange={(v: string) => onConflictStrategyChange(v as ConflictStrategy)}
          disabled={disabled}
        >
          <SelectTrigger id="conflict-strategy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest-wins">{labels.conflictNewestWins}</SelectItem>
            <SelectItem value="local-wins">{labels.conflictLocalWins}</SelectItem>
            <SelectItem value="remote-wins">{labels.conflictRemoteWins}</SelectItem>
            <SelectItem value="ask">{labels.conflictAsk}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
