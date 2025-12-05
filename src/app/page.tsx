'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/store/projectStore';
import { ProjectList } from '@/components/projects/ProjectList';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { InstallButton } from '@/components/common';
import { Button } from '@/components/ui/button';
import { StorageIndicator } from '@/components/ui/storage-indicator';
import { Plus, Palette, Settings } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { InstallSection } from './settings/components';
import { usePWAInstall } from '@/hooks';

export default function HomePage() {
  const t = useTranslations('projects');
  const { projects, isLoading, loadProjects } = useProjectStore();
 const { isInstalled } = usePWAInstall();
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="min-h-main bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">{t('header.title')}</h1>
          </div>
          <div className="flex">
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-4">
            <StorageIndicator />
            <CreateProjectDialog>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('header.newProject')}
              </Button>
            </CreateProjectDialog>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <Settings className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ProjectList projects={projects} />
          </>
        )}

        {!isInstalled && (        
        <div className="w-4/6 mx-auto">
          <InstallSection />
        </div>
        )}

      </main>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('projects');
  
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Palette className="w-16 h-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-semibold mb-2">{t('emptyState.title')}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('emptyState.description')}
      </p>
      <CreateProjectDialog>
        <Button size="lg">
          <Plus className="w-4 h-4 mr-2" />
          {t('emptyState.action')}
        </Button>
      </CreateProjectDialog>
    </div>
  );
}

function InstallPromptBanner() {
  const t = useTranslations('common');
  
  return (
    <div className="mt-8 flex justify-center">
      <InstallButton 
        label={t('install.button')} 
        tooltip={t('install.tooltip')}
        variant="outline"
        className="gap-2"
      />
    </div>
  );
}
