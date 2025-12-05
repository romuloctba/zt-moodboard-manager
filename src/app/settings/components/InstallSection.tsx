'use client';

import { useTranslations } from 'next-intl';
import { Download, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * Settings section for PWA installation
 * Shows install button when available, or installed status
 */
export function InstallSection() {
  const t = useTranslations('settings');
  const { canInstall, isInstalled, isPrompting, promptInstall } = usePWAInstall();

  // Don't render if already installed and can't install
  // (keeps section visible if install is available)
    if (!canInstall && !isInstalled) {
      return null;
    }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          {t('install.title')}
        </CardTitle>
        <CardDescription>
          {t('install.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isInstalled ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-500">
                {t('install.installed.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('install.installed.description')}
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-500/20 text-green-500">
              {t('install.installed.badge')}
            </Badge>
          </div>
        ) : canInstall ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Download className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t('install.available.title')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('install.available.description')}
                </p>
              </div>
            </div>
            
            <Button
              onClick={promptInstall}
              disabled={isPrompting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isPrompting ? t('install.button.installing') : t('install.button.install')}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
