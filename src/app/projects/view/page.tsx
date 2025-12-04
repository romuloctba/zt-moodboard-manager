'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { useNotFound } from '@/hooks/use-not-found';
import { Button } from '@/components/ui/button';
import { CreateCharacterDialog } from '@/components/characters/CreateCharacterDialog';
import { CharacterList } from '@/components/characters/CharacterList';
import { ArrowLeft, Plus, Users, Settings } from 'lucide-react';
import Link from 'next/link';

function ProjectViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  
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

  if (isLoading || !currentProject) {
    return <ProjectDetailSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{currentProject.name}</h1>
                {currentProject.description && (
                  <p className="text-sm text-muted-foreground">
                    {currentProject.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CreateCharacterDialog>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Character
                </Button>
              </CreateCharacterDialog>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/settings">
                  <Settings className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

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
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Users className="w-16 h-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-semibold mb-2">No characters yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Create your first character to start building your moodboard.
      </p>
      <CreateCharacterDialog>
        <Button size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Character
        </Button>
      </CreateCharacterDialog>
    </div>
  );
}

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
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

