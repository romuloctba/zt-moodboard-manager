'use client';

import { useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

/**
 * Settings section for language selection
 */
export function LanguageSection() {
  const t = useTranslations('settings');

  return (
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
  );
}
