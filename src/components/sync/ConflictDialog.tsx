'use client';

import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SyncConflict } from '@/lib/sync/types';

export interface ConflictDialogProps {
  open: boolean;
  conflicts: SyncConflict[];
  onResolve: (resolvedConflicts: SyncConflict[]) => void;
  onCancel: () => void;
  // i18n
  labels: {
    title: string;
    description: string;
    localVersion: string;
    remoteVersion: string;
    device: string;
    modified: string;
    keepLocal: string;
    keepRemote: string;
    skip: string;
    resolveAll: string;
    cancel: string;
    keepAllLocal: string;
    keepAllRemote: string;
    keepNewest: string;
  };
}

/**
 * Dialog for resolving sync conflicts
 */
export function ConflictDialog({
  open,
  conflicts,
  onResolve,
  onCancel,
  labels,
}: ConflictDialogProps) {
  // Generate a key based on conflict IDs to reset state when conflicts change
  const conflictKey = useMemo(() => conflicts.map(c => c.id).join('-'), [conflicts]);
  
  // State for tracking resolutions, keyed by conflict key
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'remote' | 'skip'>>({});
  const [lastConflictKey, setLastConflictKey] = useState(conflictKey);
  
  // Reset resolutions when conflicts change (using derived state pattern)
  const currentResolutions = conflictKey === lastConflictKey ? resolutions : {};
  if (conflictKey !== lastConflictKey) {
    setLastConflictKey(conflictKey);
    setResolutions({});
  }
  
  const setResolution = (id: string, resolution: 'local' | 'remote' | 'skip') => {
    setResolutions(prev => ({ ...prev, [id]: resolution }));
  };
  
  const resolveAllAs = (resolution: 'local' | 'remote' | 'newest') => {
    const newResolutions: Record<string, 'local' | 'remote' | 'skip'> = {};
    for (const conflict of conflicts) {
      if (resolution === 'newest') {
        newResolutions[conflict.id] = conflict.local.updatedAt > conflict.remote.updatedAt 
          ? 'local' 
          : 'remote';
      } else {
        newResolutions[conflict.id] = resolution;
      }
    }
    setResolutions(newResolutions);
    
    // Apply and resolve
    const resolved = conflicts.map(c => ({
      ...c,
      resolution: newResolutions[c.id],
    }));
    onResolve(resolved);
  };
  
  const handleResolve = () => {
    const resolved = conflicts.map(c => ({
      ...c,
      resolution: currentResolutions[c.id] || 'skip',
    }));
    onResolve(resolved);
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };
  
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {labels.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Quick Actions */}
        <div className="flex gap-2 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => resolveAllAs('local')}
          >
            {labels.keepAllLocal}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resolveAllAs('remote')}
          >
            {labels.keepAllRemote}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resolveAllAs('newest')}
          >
            {labels.keepNewest}
          </Button>
        </div>
        
        {/* Conflicts List */}
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <ConflictItem
                key={conflict.id}
                conflict={conflict}
                onResolution={(resolution) => setResolution(conflict.id, resolution)}
                labels={labels}
                formatDate={formatDate}
              />
            ))}
          </div>
        </ScrollArea>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {labels.cancel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleResolve}>
            {labels.resolveAll}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ConflictItemProps {
  conflict: SyncConflict;
  onResolution: (resolution: 'local' | 'remote' | 'skip') => void;
  labels: ConflictDialogProps['labels'];
  formatDate: (date: Date) => string;
}

function ConflictItem({ 
  conflict, 
  onResolution, 
  labels,
  formatDate,
}: ConflictItemProps) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-medium">{conflict.itemName}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {conflict.type}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Local Version */}
        <div className="p-3 rounded-md bg-muted/50">
          <p className="text-sm font-medium mb-1">{labels.localVersion}</p>
          <p className="text-xs text-muted-foreground">
            {labels.device}: {conflict.local.deviceName}
          </p>
          <p className="text-xs text-muted-foreground">
            {labels.modified}: {formatDate(conflict.local.updatedAt)}
          </p>
        </div>
        
        {/* Remote Version */}
        <div className="p-3 rounded-md bg-muted/50">
          <p className="text-sm font-medium mb-1">{labels.remoteVersion}</p>
          <p className="text-xs text-muted-foreground">
            {labels.device}: {conflict.remote.deviceName}
          </p>
          <p className="text-xs text-muted-foreground">
            {labels.modified}: {formatDate(conflict.remote.updatedAt)}
          </p>
        </div>
      </div>
      
      {/* Resolution Buttons */}
      <div className="flex gap-2">
        <Button
          variant={conflict.resolution === 'local' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onResolution('local')}
          className="flex-1"
        >
          {labels.keepLocal}
        </Button>
        <Button
          variant={conflict.resolution === 'remote' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onResolution('remote')}
          className="flex-1"
        >
          {labels.keepRemote}
        </Button>
        <Button
          variant={conflict.resolution === 'skip' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onResolution('skip')}
        >
          {labels.skip}
        </Button>
      </div>
    </div>
  );
}
