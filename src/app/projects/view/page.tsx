'use client';

import { Suspense, useMemo } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useProjectStore } from '@/store/projectStore';
import { useNotFound } from '@/hooks/use-not-found';
import { Button } from '@/components/ui/button';
import { CreateCharacterDialog } from '@/components/characters/CreateCharacterDialog';
import { CharacterList } from '@/components/characters/CharacterList';
import { Plus, Users, Settings } from 'lucide-react';
import Link from 'next/link';
import { Header, HeaderAction } from '@/components/layout';

function ProjectViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const t = useTranslations('characters');
  const tCommon = useTranslations('common');
  
  const { 
    currentProject, 
    characters, 
    isLoading, 
    selectProject,
    clearCurrentProject 
  } = useProjectStore();

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
      }
    }

    loadProject();
    return () => clearCurrentProject();
  }, [projectId, selectProject, clearCurrentProject, router, triggerNotFound]);

  // Define header actions
  const headerActions: HeaderAction[] = useMemo(() => [
    {
      id: 'new-character',
      element: (
        <CreateCharacterDialog>
          <Button className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {t('header.newCharacter')}
          </Button>
        </CreateCharacterDialog>
      ),
      mobilePriority: 1,
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
      mobilePriority: 2,
    },
  ], [t, tCommon]);

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

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {characters.length === 0 ? (
          <EmptyCharacterState />
        ) : (
          <CharacterList characters={characters} />
        )}
      </main>
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

