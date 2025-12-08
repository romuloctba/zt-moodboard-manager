'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/store/projectStore';
import { ProjectList } from '@/components/projects/ProjectList';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { Button } from '@/components/ui/button';
import { StorageIndicator } from '@/components/ui/storage-indicator';
import { Plus, Settings, Palette } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { InstallSection } from './settings/components';
import { usePWAInstall } from '@/hooks';
import { Header, HeaderAction } from '@/components/layout';

export default function HomePage() {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const { projects, isLoading, loadProjects } = useProjectStore();
  const { isInstalled } = usePWAInstall();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Define header actions
  const headerActions: HeaderAction[] = useMemo(() => [
    {
      id: 'language',
      element: <LanguageSwitcher />,
      mobilePriority: 4,
    },
    {
      id: 'storage',
      element: <StorageIndicator />,
      mobilePriority: 1,
    },
    {
      id: 'new-project',
      element: (
        <CreateProjectDialog>
          <Button className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {t('header.newProject')}
          </Button>
        </CreateProjectDialog>
      ),
      mobilePriority: 2,
    },
    {
      id: 'settings',
      element: (
        <Button variant="ghost" size="icon" asChild className="w-full md:w-auto md:aspect-square">
          <Link href="/settings" className="flex items-center justify-center gap-2 md:gap-0">
            <Settings className="w-5 h-5" />
            <span className="md:hidden">{tCommon('navigation.settings')}</span>
          </Link>
        </Button>
      ),
      mobilePriority: 3,
    },
  ], [t, tCommon]);

  return (
    <div className="min-h-main bg-background">
      <Header
        title={t('header.title')}
        showLogo
        actions={headerActions}
        sticky={false}
      />

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
