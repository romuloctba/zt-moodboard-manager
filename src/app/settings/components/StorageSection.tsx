'use client';

import { useTranslations } from 'next-intl';
import { HardDrive, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { StorageStats, StorageEstimate } from '@/hooks/useStorageStats';

interface StorageSectionProps {
  stats: StorageStats | null;
  storageInfo: StorageEstimate | null;
  loading: boolean;
  formatBytes: (bytes: number) => string;
}

/**
 * Settings section displaying storage statistics
 */
export function StorageSection({ 
  stats, 
  storageInfo, 
  loading,
  formatBytes 
}: StorageSectionProps) {
  const t = useTranslations('settings');

  return (
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
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <StatCard 
                value={stats.projects} 
                label={t('storage.projects')} 
              />
              <StatCard 
                value={stats.characters} 
                label={t('storage.characters')} 
              />
              <StatCard 
                value={stats.images} 
                label={t('storage.images')} 
              />
            </div>
            
            {storageInfo && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('storage.storageUsed')}</span>
                  <span>
                    {t('storage.storageFormat', { 
                      used: formatBytes(storageInfo.used), 
                      quota: formatBytes(storageInfo.quota) 
                    })}
                  </span>
                </div>
                <Progress value={storageInfo.percentage} className="h-2" />
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  value: number;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
