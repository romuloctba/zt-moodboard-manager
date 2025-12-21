'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEditionStore } from '@/store/editionStore';
import { useProjectStore } from '@/store/projectStore';
import { useNotFound } from '@/hooks/use-not-found';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PanelList, EditPageDialog } from '@/components/editions';
import { 
  ChevronLeft, 
  ChevronRight, 
  Pencil,
} from 'lucide-react';
import { Header, HeaderAction } from '@/components/layout';
import { PAGE_STATUS_COLORS } from '@/types';
import { scriptPageRepository } from '@/lib/db/repositories';

function PageEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('pageId');
  const editionId = searchParams.get('editionId');
  const projectId = searchParams.get('projectId');
  const t = useTranslations('editions.pages');

  const { 
    currentEdition,
    currentPage,
    panels,
    pages,
    selectEdition,
    selectPage,
    clearCurrentPage,
  } = useEditionStore();

  const { characters, selectProject, currentProject } = useProjectStore();
  const { triggerNotFound } = useNotFound({ entity: 'Page' });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [prevPage, setPrevPage] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);

  useEffect(() => {
    if (!pageId || !editionId || !projectId) {
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

      // Ensure edition is selected
      if (!currentEdition || currentEdition.id !== editionId) {
        const found = await selectEdition(editionId!);
        if (!found) {
          triggerNotFound();
          return;
        }
      }

      const found = await selectPage(pageId!);
      if (!found) {
        triggerNotFound();
        return;
      }

      // Load prev/next page info
      const prev = await scriptPageRepository.getPreviousPage(pageId!);
      const next = await scriptPageRepository.getNextPage(pageId!);
      setPrevPage(prev?.id ?? null);
      setNextPage(next?.id ?? null);
    }

    load();
    return () => clearCurrentPage();
  }, [pageId, editionId, projectId, selectEdition, selectPage, selectProject, clearCurrentPage, router, triggerNotFound, currentProject, currentEdition]);

  const navigateToPage = (targetPageId: string) => {
    router.push(`/projects/view/editions/pages?pageId=${targetPageId}&editionId=${editionId}&projectId=${projectId}`);
  };

  // Define header actions
  const headerActions: HeaderAction[] = useMemo(() => [
    {
      id: 'edit-page',
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
      mobilePriority: 1,
    },
  ], [t]);

  if (!currentPage || !currentEdition) {
    return <PageEditorSkeleton />;
  }

  const statusColor = PAGE_STATUS_COLORS[currentPage.status];

  return (
    <div className="min-h-main bg-background">
      <Header
        title={currentPage.title || `${t('card.page', { number: currentPage.pageNumber })}`}
        subtitle={currentEdition.title}
        backHref={`/projects/view/editions?editionId=${editionId}&projectId=${projectId}`}
        actions={headerActions}
      />

      {/* Page Navigation */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={!prevPage}
              onClick={() => prevPage && navigateToPage(prevPage)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline"
                style={{ borderColor: statusColor, color: statusColor }}
              >
                {t(`status.${currentPage.status}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Page {currentPage.pageNumber} of {pages.length}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled={!nextPage}
              onClick={() => nextPage && navigateToPage(nextPage)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Page Info */}
      {(currentPage.goal || currentPage.setting) && (
        <div className="border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex flex-wrap gap-6 text-sm">
              {currentPage.goal && (
                <div>
                  <span className="text-muted-foreground font-medium">Goal: </span>
                  <span>{currentPage.goal}</span>
                </div>
              )}
              {currentPage.setting && (
                <div>
                  <span className="text-muted-foreground font-medium">Setting: </span>
                  <span>{currentPage.setting}</span>
                </div>
              )}
              {currentPage.timeOfDay && (
                <div>
                  <span className="text-muted-foreground font-medium">Time: </span>
                  <span>{currentPage.timeOfDay}</span>
                </div>
              )}
              {currentPage.mood && (
                <div>
                  <span className="text-muted-foreground font-medium">Mood: </span>
                  <span>{currentPage.mood}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Panel List */}
      <main className="container mx-auto px-6 py-8">
        <PanelList panels={panels} characters={characters} />
      </main>

      {/* Edit Page Dialog */}
      <EditPageDialog
        page={currentPage}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </div>
  );
}

function PageEditorSkeleton() {
  return (
    <div className="min-h-main bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="w-32 h-6 bg-muted animate-pulse rounded" />
              <div className="w-24 h-4 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function PageEditorPage() {
  return (
    <Suspense fallback={<PageEditorSkeleton />}>
      <PageEditorContent />
    </Suspense>
  );
}
