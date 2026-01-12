'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/store/projectStore';
import { ProjectList } from '@/components/projects/ProjectList';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { Button } from '@/components/ui/button';
import { StorageIndicator } from '@/components/ui/storage-indicator';
import { Plus, Settings, Cloud, Palette, HelpCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { FloatingHelpButton } from '@/components/ui/floating-help-button';
import { InstallSection } from './settings/components';
import { usePWAInstall } from '@/hooks';
import { Header, HeaderAction } from '@/components/layout';

export default function HomePage() {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const { projects, isLoading, loadProjects } = useProjectStore();
  const { isInstalled } = usePWAInstall();
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);

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
        <Button className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          {t('header.newProject')}
        </Button>
      ),
      onClick: () => setShowCreateProjectDialog(true),
      mobilePriority: 2,
    },
    {
      id: 'sync',
      element: (
        <Button variant="ghost" size="icon" asChild className="w-full md:w-auto md:aspect-square">
          <Link href="/sync" className="flex items-center justify-center gap-2 md:gap-0">
            <Cloud className="w-5 h-5" />
            <span className="md:hidden">{tCommon('navigation.sync')}</span>
          </Link>
        </Button>
      ),
      mobilePriority: 3,
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
      mobilePriority: 4,
    },
    {
      id: 'help',
      element: (
        <Button variant="ghost" size="icon" asChild className="w-full md:w-auto md:aspect-square">
          <Link href="/help" className="flex items-center justify-center gap-2 md:gap-0">
            <HelpCircle className="w-5 h-5" />
            <span className="md:hidden">{tCommon('help.viewGuide')}</span>
          </Link>
        </Button>
      ),
      mobilePriority: 5,
      showOnDesktop: false,
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

      {/* Controlled dialog rendered outside Header/Sheet for mobile compatibility */}
      <CreateProjectDialog 
        open={showCreateProjectDialog} 
        onOpenChange={setShowCreateProjectDialog} 
      />

      {/* Floating Help Button - only show when projects exist */}
      {projects.length > 0 && !isLoading && <FloatingHelpButton />}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Main Empty State */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-8">
          {/* Decorative background circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/5 animate-pulse" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10" />
          </div>
          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
            <Palette className="w-10 h-10 text-primary" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-3">{t('emptyState.title')}</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          {t('emptyState.description')}
        </p>
        
        <CreateProjectDialog>
          <Button size="lg" className="mb-4 shadow-lg hover:shadow-xl transition-shadow">
            <Plus className="w-5 h-5 mr-2" />
            {t('emptyState.action')}
          </Button>
        </CreateProjectDialog>
      </div>

      {/* Separator */}
      <div className="relative my-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-4 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Help Guide CTA */}
      <Link href="/help">
        <div className="group relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8 hover:border-primary/40 transition-all duration-300 hover:shadow-lg cursor-pointer">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {/* Icon */}
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Palette className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                {t('emptyState.helpTitle')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('emptyState.helpDescription')}
              </p>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                <span>{t('emptyState.helpAction')}</span>
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
