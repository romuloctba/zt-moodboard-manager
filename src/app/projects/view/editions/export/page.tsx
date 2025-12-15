'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEditionStore } from '@/store/editionStore';
import { useProjectStore } from '@/store/projectStore';
import { useNotFound } from '@/hooks/use-not-found';
import { ScriptDocument } from '@/components/editions';
import { panelRepository } from '@/lib/db/repositories';
import type { Panel } from '@/types';
import { Loader2 } from 'lucide-react';

function ExportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editionId = searchParams.get('editionId');
  const projectId = searchParams.get('projectId');
  const t = useTranslations('editions.export');

  const { 
    currentEdition,
    pages,
    selectEdition,
    clearCurrentEdition,
  } = useEditionStore();

  const { selectProject, currentProject } = useProjectStore();
  const { triggerNotFound } = useNotFound({ entity: 'Edition' });
  
  const [panelsByPage, setPanelsByPage] = useState<Record<string, Panel[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load edition, pages, and all panels
  useEffect(() => {
    if (!editionId || !projectId) {
      router.push('/');
      return;
    }

    async function load() {
      setIsLoading(true);
      
      // Ensure project is selected
      if (!currentProject || currentProject.id !== projectId) {
        const found = await selectProject(projectId!);
        if (!found) {
          triggerNotFound();
          return;
        }
      }

      // Load edition and its pages
      const found = await selectEdition(editionId!);
      if (!found) {
        triggerNotFound();
        return;
      }
    }

    load();
    return () => clearCurrentEdition();
  }, [editionId, projectId, selectEdition, selectProject, clearCurrentEdition, router, triggerNotFound, currentProject]);

  // Load panels for all pages once pages are loaded
  useEffect(() => {
    async function loadAllPanels() {
      if (pages.length === 0) {
        setIsLoading(false);
        return;
      }

      const panelsMap: Record<string, Panel[]> = {};
      
      for (const page of pages) {
        const panels = await panelRepository.getByPage(page.id);
        panelsMap[page.id] = panels;
      }
      
      setPanelsByPage(panelsMap);
      setIsLoading(false);
    }

    if (currentEdition && pages.length >= 0) {
      loadAllPanels();
    }
  }, [currentEdition, pages]);

  if (isLoading || !currentEdition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ScriptDocument
      edition={currentEdition}
      pages={pages}
      panelsByPage={panelsByPage}
      projectId={projectId!}
    />
  );
}

export default function ExportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ExportContent />
    </Suspense>
  );
}
