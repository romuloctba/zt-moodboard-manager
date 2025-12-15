'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEditionStore } from '@/store/editionStore';
import { useProjectStore } from '@/store/projectStore';
import { useNotFound } from '@/hooks/use-not-found';
import { Button } from '@/components/ui/button';
import { PageList, CreatePageDialog, EditEditionDialog } from '@/components/editions';
import { Plus, FileText, Settings, Pencil } from 'lucide-react';
import { Header, HeaderAction } from '@/components/layout';
import type { Edition } from '@/types';

function EditionViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editionId = searchParams.get('editionId');
  const projectId = searchParams.get('projectId');
  const t = useTranslations('editions');
  const tPages = useTranslations('editions.pages');

  const { 
    currentEdition,
    pages,
    isLoading,
    selectEdition,
    clearCurrentEdition,
  } = useEditionStore();

  const { selectProject, currentProject } = useProjectStore();
  const { triggerNotFound } = useNotFound({ entity: 'Edition' });
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (!editionId || !projectId) {
      router.push('/');
      return;
    }

    async function load() {
      // Ensure project is selected
      if (!currentProject || currentProject.id !== projectId) {
        const found = await selectProject(projectId!);
        if (!found) {
          triggerNotFound();
          return;
        }
      }

      const found = await selectEdition(editionId!);
      if (!found) {
        triggerNotFound();
      }
    }

    load();
    return () => clearCurrentEdition();
  }, [editionId, projectId, selectEdition, selectProject, clearCurrentEdition, router, triggerNotFound, currentProject]);

  const handlePageClick = (page: { id: string }) => {
    router.push(`/projects/view/editions/pages?pageId=${page.id}&editionId=${editionId}&projectId=${projectId}`);
  };

  // Define header actions
  const headerActions: HeaderAction[] = useMemo(() => [
    {
      id: 'new-page',
      element: (
        <CreatePageDialog>
          <Button className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {tPages('header.newPage')}
          </Button>
        </CreatePageDialog>
      ),
      mobilePriority: 1,
    },
    {
      id: 'edit-edition',
      element: (
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-full md:w-auto md:aspect-square"
          onClick={() => setShowEditDialog(true)}
        >
          <Pencil className="w-5 h-5" />
          <span className="md:hidden ml-2">{t('menu.edit')}</span>
        </Button>
      ),
      mobilePriority: 2,
    },
  ], [t, tPages]);

  if (isLoading || !currentEdition) {
    return <EditionDetailSkeleton />;
  }

  const subtitle = [
    currentEdition.issueNumber && t('card.issue', { number: currentEdition.issueNumber }),
    currentEdition.synopsis,
  ].filter(Boolean).join(' • ');

  return (
    <div className="min-h-main bg-background">
      <Header
        title={currentEdition.title}
        subtitle={subtitle}
        backHref={`/projects/view?projectId=${projectId}`}
        actions={headerActions}
      />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {pages.length === 0 ? (
          <EmptyPagesState />
        ) : (
          <PageList pages={pages} onPageClick={handlePageClick} />
        )}
      </main>

      {/* Edit Edition Dialog */}
      <EditEditionDialog
        edition={currentEdition}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </div>
  );
}

function EmptyPagesState() {
  const t = useTranslations('editions.pages.emptyState');
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FileText className="w-16 h-16 text-muted-foreground mb-6" />
      <h2 className="text-2xl font-semibold mb-2">{t('title')}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('description')}
      </p>
      <CreatePageDialog>
        <Button size="lg">
          <Plus className="w-4 h-4 mr-2" />
          {t('action')}
        </Button>
      </CreatePageDialog>
    </div>
  );
}

function EditionDetailSkeleton() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function EditionViewPage() {
  return (
    <Suspense fallback={<EditionDetailSkeleton />}>
      <EditionViewContent />
    </Suspense>
  );
}
