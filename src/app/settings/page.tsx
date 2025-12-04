'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Loader2, 
  HardDrive,
  AlertTriangle,
  FileArchive,
  Database,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  createFullBackup, 
  restoreFromBackup, 
  validateBackup,
  getDatabaseStats,
  clearAllData,
  type BackupProgress,
  type RestoreProgress,
  type BackupManifest
} from '@/lib/export/backupService';
import { fileStorage } from '@/lib/storage/fileStorage';

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  
  // Restore confirmation dialog
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [pendingManifest, setPendingManifest] = useState<BackupManifest | null>(null);
  
  // Clear data dialog
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<{
    projects: number;
    characters: number;
    images: number;
    storageUsed: string;
  } | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    quota: number;
    percentage: number;
  } | null>(null);

  // Load stats on mount
  useEffect(() => {
    async function loadStats() {
      try {
        const dbStats = await getDatabaseStats();
        setStats(dbStats);
        
        const storage = await fileStorage.getStorageEstimate();
        setStorageInfo(storage);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }
    loadStats();
  }, []);

  // Handle backup
  const handleBackup = useCallback(async () => {
    setIsBackingUp(true);
    setBackupProgress(null);
    
    try {
      await createFullBackup((progress) => {
        setBackupProgress(progress);
      });
      toast.success('Backup created successfully!');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Failed to create backup');
    } finally {
      setIsBackingUp(false);
      setBackupProgress(null);
    }
  }, []);

  // Handle file selection for restore
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input
    e.target.value = '';
    
    // Validate the backup
    const validation = await validateBackup(file);
    
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid backup file');
      return;
    }
    
    // Show confirmation dialog
    setPendingRestoreFile(file);
    setPendingManifest(validation.manifest!);
    setShowRestoreConfirm(true);
  }, []);

  // Confirm and execute restore
  const confirmRestore = useCallback(async () => {
    if (!pendingRestoreFile) return;
    
    setShowRestoreConfirm(false);
    setIsRestoring(true);
    setRestoreProgress(null);
    
    try {
      await restoreFromBackup(pendingRestoreFile, (progress) => {
        setRestoreProgress(progress);
      });
      
      toast.success('Restore complete! Refreshing...');
      
      // Refresh stats
      const dbStats = await getDatabaseStats();
      setStats(dbStats);
      
      // Small delay then redirect to home
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
      setRestoreProgress(null);
      setPendingRestoreFile(null);
      setPendingManifest(null);
    }
  }, [pendingRestoreFile, router]);

  // Clear all data
  const confirmClearData = useCallback(async () => {
    setShowClearConfirm(false);
    setIsClearing(true);
    
    try {
      const result = await clearAllData();
      toast.success(`Cleared ${result.filesDeleted} files. Storage freed!`);
      
      // Refresh stats
      const dbStats = await getDatabaseStats();
      setStats(dbStats);
      
      const storage = await fileStorage.getStorageEstimate();
      setStorageInfo(storage);
    } catch (error) {
      console.error('Clear data failed:', error);
      toast.error('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  }, []);

  const formatBytes = (bytes: number) => fileStorage.formatBytes(bytes);

  const getProgressPercent = (progress: BackupProgress | RestoreProgress | null) => {
    if (!progress) return 0;
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Storage Stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage
            </CardTitle>
            <CardDescription>
              Your data is stored locally on this device
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{stats.projects}</div>
                    <div className="text-sm text-muted-foreground">Projects</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.characters}</div>
                    <div className="text-sm text-muted-foreground">Characters</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.images}</div>
                    <div className="text-sm text-muted-foreground">Images</div>
                  </div>
                </div>
                
                {storageInfo && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Storage used</span>
                      <span>{formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}</span>
                    </div>
                    <Progress value={storageInfo.percentage} className="h-2" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup & Restore
            </CardTitle>
            <CardDescription>
              Export your data to transfer to another device or create a backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Backup */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Create Backup</div>
                  <div className="text-sm text-muted-foreground">
                    Download all projects, characters, and images
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleBackup} 
                disabled={isBackingUp || isRestoring}
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Backing up...
                  </>
                ) : (
                  <>
                    <FileArchive className="h-4 w-4 mr-2" />
                    Backup
                  </>
                )}
              </Button>
            </div>

            {/* Backup Progress */}
            {isBackingUp && backupProgress && (
              <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{backupProgress.message}</span>
                  <span>{getProgressPercent(backupProgress)}%</span>
                </div>
                <Progress value={getProgressPercent(backupProgress)} className="h-2" />
              </div>
            )}

            {/* Restore */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Upload className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="font-medium">Restore from Backup</div>
                  <div className="text-sm text-muted-foreground">
                    Import a previously exported backup file
                  </div>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBackingUp || isRestoring}
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Restore
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Restore Progress */}
            {isRestoring && restoreProgress && (
              <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{restoreProgress.message}</span>
                  <span>{getProgressPercent(restoreProgress)}%</span>
                </div>
                <Progress value={getProgressPercent(restoreProgress)} className="h-2" />
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-orange-500">Important</div>
                <div className="text-muted-foreground">
                  Restoring a backup will replace all current data. Make sure to create a backup first if you want to keep your current work.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mt-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently delete all data including files from storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="font-medium">Clear All Data</div>
                  <div className="text-sm text-muted-foreground">
                    Delete all projects, characters, images, and free up storage
                  </div>
                </div>
              </div>
              <Button 
                variant="destructive"
                onClick={() => setShowClearConfirm(true)}
                disabled={isBackingUp || isRestoring || isClearing}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Restore
            </DialogTitle>
            <DialogDescription>
              This will replace all your current data with the backup contents.
            </DialogDescription>
          </DialogHeader>

          {pendingManifest && (
            <div className="space-y-3 py-2">
              <div className="text-sm font-medium">Backup Details:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Created:</div>
                <div>{new Date(pendingManifest.createdAt).toLocaleString()}</div>
                <div className="text-muted-foreground">Projects:</div>
                <div>{pendingManifest.stats.projects}</div>
                <div className="text-muted-foreground">Characters:</div>
                <div>{pendingManifest.stats.characters}</div>
                <div className="text-muted-foreground">Images:</div>
                <div>{pendingManifest.stats.images}</div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <Trash2 className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">
                  Your current {stats?.projects || 0} projects, {stats?.characters || 0} characters, and {stats?.images || 0} images will be deleted.
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRestore}>
              <Upload className="h-4 w-4 mr-2" />
              Restore Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Clear All Data?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">
                This will permanently delete:
                <ul className="list-disc list-inside mt-1">
                  <li>{stats?.projects || 0} projects</li>
                  <li>{stats?.characters || 0} characters</li>
                  <li>{stats?.images || 0} images</li>
                  <li>All files in OPFS storage</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Yes, Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
