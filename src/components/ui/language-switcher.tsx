'use client';

import { useTranslations } from 'next-intl';
import { useLocaleStore } from '@/store/localeStore';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';

export function LanguageSwitcher() {
  const t = useTranslations('settings.language');
  const { locale, setLocale } = useLocaleStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Languages className="h-4 w-4 mr-2" />
          {localeFlags[locale]} {localeNames[locale]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc as Locale)}
            className="flex items-center justify-between"
          >
            <span>
              {localeFlags[loc]} {localeNames[loc]}
            </span>
            {locale === loc && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
