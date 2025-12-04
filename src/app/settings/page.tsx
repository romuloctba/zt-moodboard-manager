'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Loader2, 
  HardDrive,
  AlertTriangle,
  FileArchive,
  Database,
  Trash2,
  Globe
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
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
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
      toast.success(t('backup.toast.created'));
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error(t('backup.toast.createFailed'));
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
      toast.error(validation.error || t('backup.toast.invalidFile'));
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
      
      toast.success(t('backup.toast.restored'));
      
      // Refresh stats
      const dbStats = await getDatabaseStats();
      setStats(dbStats);
      
      // Small delay then redirect to home
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(error instanceof Error ? error.message : t('backup.toast.restoreFailed'));
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
      toast.success(t('dangerZone.toast.cleared', { count: result.filesDeleted }));
      
      // Refresh stats
      const dbStats = await getDatabaseStats();
      setStats(dbStats);
      
      const storage = await fileStorage.getStorageEstimate();
      setStorageInfo(storage);
    } catch (error) {
      console.error('Clear data failed:', error);
      toast.error(t('dangerZone.toast.clearFailed'));
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
            <h1 className="text-xl font-semibold">{t('title')}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Language Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('language.title')}
            </CardTitle>
            <CardDescription>
              {t('language.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        {/* Storage Stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {t('storage.title')}
            </CardTitle>
            <CardDescription>
              {t('storage.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{stats.projects}</div>
                    <div className="text-sm text-muted-foreground">{t('storage.projects')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.characters}</div>
                    <div className="text-sm text-muted-foreground">{t('storage.characters')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.images}</div>
                    <div className="text-sm text-muted-foreground">{t('storage.images')}</div>
                  </div>
                </div>
                
                {storageInfo && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('storage.storageUsed')}</span>
                      <span>{t('storage.storageFormat', { used: formatBytes(storageInfo.used), quota: formatBytes(storageInfo.quota) })}</span>
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
              {t('backup.title')}
            </CardTitle>
            <CardDescription>
              {t('backup.description')}
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
                  <div className="font-medium">{t('backup.create.title')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('backup.create.description')}
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
                    {t('backup.create.inProgress')}
                  </>
                ) : (
                  <>
                    <FileArchive className="h-4 w-4 mr-2" />
                    {t('backup.create.button')}
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
                  <div className="font-medium">{t('backup.restore.title')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('backup.restore.description')}
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
                    {t('backup.restore.inProgress')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('backup.restore.button')}
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
                <div className="font-medium text-orange-500">{t('backup.warning.title')}</div>
                <div className="text-muted-foreground">
                  {t('backup.warning.description')}
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
              {t('dangerZone.title')}
            </CardTitle>
            <CardDescription>
              {t('dangerZone.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="font-medium">{t('dangerZone.clearAll.title')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('dangerZone.clearAll.description')}
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
                    {t('dangerZone.clearAll.inProgress')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('dangerZone.clearAll.button')}
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
              {t('backup.confirmRestore.title')}
            </DialogTitle>
            <DialogDescription>
              {t('backup.confirmRestore.description')}
            </DialogDescription>
          </DialogHeader>

          {pendingManifest && (
            <div className="space-y-3 py-2">
              <div className="text-sm font-medium">{t('backup.confirmRestore.details')}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">{t('backup.confirmRestore.created')}</div>
                <div>{new Date(pendingManifest.createdAt).toLocaleString()}</div>
                <div className="text-muted-foreground">{t('backup.confirmRestore.projects')}</div>
                <div>{pendingManifest.stats.projects}</div>
                <div className="text-muted-foreground">{t('backup.confirmRestore.characters')}</div>
                <div>{pendingManifest.stats.characters}</div>
                <div className="text-muted-foreground">{t('backup.confirmRestore.images')}</div>
                <div>{pendingManifest.stats.images}</div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <Trash2 className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-destructive">
                  {t('backup.confirmRestore.warning', { projects: stats?.projects || 0, characters: stats?.characters || 0, images: stats?.images || 0 })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmRestore}>
              <Upload className="h-4 w-4 mr-2" />
              {t('backup.confirmRestore.confirm')}
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
              {t('dangerZone.confirmClear.title')}
            </DialogTitle>
            <DialogDescription>
              {t('dangerZone.confirmClear.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">
                {t('dangerZone.confirmClear.warning')}
                <ul className="list-disc list-inside mt-1">
                  <li>{t('dangerZone.confirmClear.projects', { count: stats?.projects || 0 })}</li>
                  <li>{t('dangerZone.confirmClear.characters', { count: stats?.characters || 0 })}</li>
                  <li>{t('dangerZone.confirmClear.images', { count: stats?.images || 0 })}</li>
                  <li>{t('dangerZone.confirmClear.files')}</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmClearData}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('dangerZone.confirmClear.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
