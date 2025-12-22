'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/store/projectStore';
import { useEditionStore } from '@/store/editionStore';
import { useNotFound } from '@/hooks/use-not-found';
import { Button } from '@/components/ui/button';
import { CreateCharacterDialog } from '@/components/characters/CreateCharacterDialog';
import { CharacterList } from '@/components/characters/CharacterList';
import { EditionList, CreateEditionDialog } from '@/components/editions';
import { Plus, Users, Settings, Cloud, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Header, HeaderAction } from '@/components/layout';
import { cn } from '@/lib/utils';
import type { Edition } from '@/types';

type TabType = 'characters' | 'editions';

function ProjectViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const initialTab = (searchParams.get('tab') as TabType) || 'characters';
  const t = useTranslations('characters');
  const tEditions = useTranslations('editions');
  const tCommon = useTranslations('common');
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // Controlled dialog states
  const [showCreateCharacterDialog, setShowCreateCharacterDialog] = useState(false);
  const [showCreateEditionDialog, setShowCreateEditionDialog] = useState(false);

  const { 
    currentProject, 
    characters, 
    isLoading, 
    selectProject,
    clearCurrentProject 
  } = useProjectStore();

  const {
    editions,
    loadEditions,
  } = useEditionStore();

  const { triggerNotFound } = useNotFound({
    entity: 'Project',
  });

  useEffect(() => {
    if (!projectId) {
      router.push('/');
      return;
    }

    async function loadProject() {
      const found = await selectProject(projectId!);
      if (!found) {
        triggerNotFound();
      } else {
        // Load editions for the project
        await loadEditions(projectId!);
      }
    }

    loadProject();
    return () => clearCurrentProject();
  }, [projectId, selectProject, clearCurrentProject, router, triggerNotFound, loadEditions]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleEditionClick = (edition: Edition) => {
    router.push(`/projects/view/editions?editionId=${edition.id}&projectId=${projectId}`);
  };

  // Define header actions based on active tab
  const headerActions: HeaderAction[] = useMemo(() => {
    const actions: HeaderAction[] = [];

    if (activeTab === 'characters') {
      actions.push({
        id: 'new-character',
        element: (
          <Button className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {t('header.newCharacter')}
          </Button>
        ),
        onClick: () => setShowCreateCharacterDialog(true),
        mobilePriority: 1,
      });
    } else {
      actions.push({
        id: 'new-edition',
        element: (
          <Button className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {tEditions('header.newEdition')}
          </Button>
        ),
        onClick: () => setShowCreateEditionDialog(true),
        mobilePriority: 1,
      });
    }

    actions.push(
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
      }
    );

    return actions;
  }, [activeTab, t, tEditions, tCommon]);

  if (isLoading || !currentProject) {
    return <ProjectDetailSkeleton />;
  }

  return (
    <div className="min-h-main bg-background">
      <Header
        title={currentProject.name}
        subtitle={currentProject.description}
        backHref="/"
        actions={headerActions}
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('characters')}
              className={cn(
                'flex items-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'characters'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Users className="w-4 h-4" />
              {tEditions('tabs.characters')}
              <span className="text-xs text-muted-foreground">({characters.length})</span>
            </button>
            <button
              onClick={() => handleTabChange('editions')}
              className={cn(
                'flex items-center gap-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'editions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <BookOpen className="w-4 h-4" />
              {tEditions('tabs.editions')}
              <span className="text-xs text-muted-foreground">({editions.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'characters' ? (
          characters.length === 0 ? (
            <EmptyCharacterState />
          ) : (
            <CharacterList characters={characters} />
          )
        ) : (
          editions.length === 0 ? (
            <EmptyEditionState projectId={projectId!} />
          ) : (
            <EditionList editions={editions} onEditionClick={handleEditionClick} />
          )
        )}
      </main>

      {/* Controlled Dialogs - rendered at page level */}
      <CreateCharacterDialog 
        open={showCreateCharacterDialog} 
        onOpenChange={setShowCreateCharacterDialog} 
      />
      {projectId && (
        <CreateEditionDialog 
          projectId={projectId}
          open={showCreateEditionDialog} 
          onOpenChange={setShowCreateEditionDialog} 
        />
      )}
    </div>
  );
}

function EmptyCharacterState() {
  const t = useTranslations('characters.emptyState');
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Users className="w-16 h-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-semibold mb-2">{t('title')}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('description')}
      </p>
      <CreateCharacterDialog>
        <Button size="lg">
          <Plus className="w-4 h-4 mr-2" />
          {t('action')}
        </Button>
      </CreateCharacterDialog>
    </div>
  );
}

function EmptyEditionState({ projectId }: { projectId: string }) {
  const t = useTranslations('editions.emptyState');
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <BookOpen className="w-16 h-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-semibold mb-2">{t('title')}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('description')}
      </p>
      <CreateEditionDialog projectId={projectId}>
        <Button size="lg">
          <Plus className="w-4 h-4 mr-2" />
          {t('action')}
        </Button>
      </CreateEditionDialog>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-main bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="w-48 h-6 bg-muted animate-pulse rounded" />
              <div className="w-32 h-4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ProjectViewPage() {
  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectViewContent />
    </Suspense>
  );
}

