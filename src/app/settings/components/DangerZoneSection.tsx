'use client';

import { useTranslations } from 'next-intl';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DangerZoneSectionProps {
  isClearing: boolean;
  disabled: boolean;
  onClear: () => void;
}

/**
 * Settings section for dangerous operations (clear all data)
 */
export function DangerZoneSection({
  isClearing,
  disabled,
  onClear,
}: DangerZoneSectionProps) {
  const t = useTranslations('settings');

  return (
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
            onClick={onClear}
            disabled={disabled || isClearing}
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
  );
}
