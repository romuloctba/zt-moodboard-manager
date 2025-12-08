'use client';

import { Suspense, useMemo } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Upload, Loader2, Download, LayoutGrid, PenTool, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageIndicator } from '@/components/ui/storage-indicator';
import { characterRepository, projectRepository } from '@/lib/db/repositories';
import { exportCharacterImages } from '@/lib/export/exportService';
import { useNotFound } from '@/hooks/use-not-found';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/media/ImageUploader';
import { ImageGrid } from '@/components/media/ImageGrid';
import { MoodboardCanvas } from '@/components/canvas';
import { CharacterProfile } from '@/components/characters';
import { Header, HeaderAction } from '@/components/layout';
import type { Character, CanvasState } from '@/types';

type ViewMode = 'grid' | 'canvas' | 'profile';

// View Mode Toggle Component - used in both desktop header and mobile menu
function ViewModeToggle({ 
  viewMode, 
  setViewMode, 
  t,
  variant = 'desktop'
}: { 
  viewMode: ViewMode; 
  setViewMode: (mode: ViewMode) => void;
  t: (key: string) => string;
  variant?: 'desktop' | 'mobile';
}) {
  if (variant === 'mobile') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <span className="text-sm font-medium text-muted-foreground mb-1 px-4">{t('viewMode.label')}</span>
        <div className="flex flex-col gap-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="justify-start h-10"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            {t('viewMode.grid')}
          </Button>
          <Button
            variant={viewMode === 'canvas' ? 'secondary' : 'ghost'}
            size="sm"
            className="justify-start h-10"
            onClick={() => setViewMode('canvas')}
          >
            <PenTool className="h-4 w-4 mr-2" />
            {t('viewMode.canvas')}
          </Button>
          <Button
            variant={viewMode === 'profile' ? 'secondary' : 'ghost'}
            size="sm"
            className="justify-start h-10"
            onClick={() => setViewMode('profile')}
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('viewMode.profile')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center border rounded-lg p-1">
      <Button
        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8"
        onClick={() => setViewMode('grid')}
      >
        <LayoutGrid className="h-4 w-4 mr-1.5" />
        {t('viewMode.grid')}
      </Button>
      <Button
        variant={viewMode === 'canvas' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8"
        onClick={() => setViewMode('canvas')}
      >
        <PenTool className="h-4 w-4 mr-1.5" />
        {t('viewMode.canvas')}
      </Button>
      <Button
        variant={viewMode === 'profile' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8"
        onClick={() => setViewMode('profile')}
      >
        <FileText className="h-4 w-4 mr-1.5" />
        {t('viewMode.profile')}
      </Button>
    </div>
  );
}

function CharacterViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const characterId = searchParams.get('characterId');
  const t = useTranslations('characters');
  const tMedia = useTranslations('media');

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const { triggerNotFound: triggerProjectNotFound } = useNotFound({
    entity: 'Project',
  });

  const { triggerNotFound: triggerCharacterNotFound } = useNotFound({
    entity: 'Character',
    redirectTo: projectId ? `/projects/view?projectId=${projectId}` : undefined,
  });

  useEffect(() => {
    async function loadCharacter() {
      if (!characterId || !projectId) {
        router.push('/');
        return;
      }

      try {
        // First verify the project exists
        const project = await projectRepository.getById(projectId);
        if (!project) {
          triggerProjectNotFound();
          return;
        }

        const char = await characterRepository.getById(characterId);
        if (char && char.projectId === projectId) {
          setCharacter(char);
        } else {
          triggerCharacterNotFound();
        }
      } catch (error) {
        console.error('Failed to load character:', error);
        triggerCharacterNotFound();
      } finally {
        setLoading(false);
      }
    }

    loadCharacter();
  }, [characterId, projectId, router, triggerProjectNotFound, triggerCharacterNotFound]);

  const handleUploadComplete = useCallback(() => {
    // Trigger a refresh of the image grid
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleCanvasChange = useCallback(async (canvasState: CanvasState) => {
    if (!character) return;
    try {
      await characterRepository.updateCanvasState(character.id, canvasState);
    } catch (error) {
      console.error('Failed to save canvas state:', error);
    }
  }, [character]);

  const handleExportAll = useCallback(async () => {
    if (!character || exporting) return;
    
    try {
      setExporting(true);
      await exportCharacterImages(character);
      toast.success(t('toast.exportSuccess'));
    } catch (error) {
      if (error instanceof Error && error.message === 'No images to export') {
        toast.error(t('toast.noImagesToExport'));
      } else {
        console.error('Export failed:', error);
        toast.error(t('toast.exportFailed'));
      }
    } finally {
      setExporting(false);
    }
  }, [character, exporting, t]);

  // Define header actions
  const headerActions: HeaderAction[] = useMemo(() => [
    {
      id: 'storage',
      element: <StorageIndicator />,
      mobilePriority: 4,
    },
    {
      id: 'view-mode',
      element: <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} t={t} variant="desktop" />,
      showOnMobile: false,
      mobilePriority: 1,
    },
    {
      id: 'view-mode-mobile',
      element: <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} t={t} variant="mobile" />,
      showOnDesktop: false,
      mobilePriority: 1,
    },
    {
      id: 'export',
      element: (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAll}
          disabled={exporting}
          className="w-full md:w-auto"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {t('export.all')}
        </Button>
      ),
      mobilePriority: 2,
    },
  ], [viewMode, exporting, t, handleExportAll]);

  if (loading) {
    return (
      <div className="min-h-main bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!character || !projectId) {
    return null;
  }

  return (
    <div className="min-h-main bg-background">
      <Header
        title={character.name}
        subtitle={character.description}
        backHref={`/projects/view?projectId=${projectId}`}
        actions={headerActions}
      />

      {/* Main Content */}
      {viewMode === 'grid' ? (
        <main className="container mx-auto px-4 py-6">
          {/* Upload Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-medium">{tMedia('upload.addImages')}</h2>
            </div>
            <ImageUploader
              characterId={characterId!}
              onUploadComplete={handleUploadComplete}
            />
          </section>

          {/* Image Gallery */}
          <section>
            <h2 className="text-lg font-medium mb-4">{tMedia('referenceImages')}</h2>
            <ImageGrid
              key={refreshKey}
              characterId={characterId!}
            />
          </section>
        </main>
      ) : viewMode === 'canvas' ? (
        <main className="h-main">
          <MoodboardCanvas
            characterId={characterId!}
            canvasState={character.canvasState}
            onCanvasChange={handleCanvasChange}
          />
        </main>
      ) : (
        <main>
          <CharacterProfile
            character={character}
            onUpdate={setCharacter}
          />
        </main>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-main bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CharacterViewPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CharacterViewContent />
    </Suspense>
  );
}
