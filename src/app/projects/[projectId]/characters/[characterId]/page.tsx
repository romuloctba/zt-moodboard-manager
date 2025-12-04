'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, User, Loader2, Download, LayoutGrid, PenTool, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageIndicator } from '@/components/ui/storage-indicator';
import { characterRepository } from '@/lib/db/repositories';
import { exportCharacterImages } from '@/lib/export/exportService';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/media/ImageUploader';
import { ImageGrid } from '@/components/media/ImageGrid';
import { MoodboardCanvas } from '@/components/canvas';
import { CharacterProfile } from '@/components/characters';
import type { Character, CanvasState } from '@/types';

type ViewMode = 'grid' | 'canvas' | 'profile';

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const characterId = params.characterId as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    async function loadCharacter() {
      try {
        const char = await characterRepository.getById(characterId);
        if (char && char.projectId === projectId) {
          setCharacter(char);
        } else {
          router.replace(`/projects/${projectId}`);
        }
      } catch (error) {
        console.error('Failed to load character:', error);
        router.replace(`/projects/${projectId}`);
      } finally {
        setLoading(false);
      }
    }

    loadCharacter();
  }, [characterId, projectId, router]);

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

  const handleExportAll = async () => {
    if (!character || exporting) return;
    
    try {
      setExporting(true);
      await exportCharacterImages(character);
      toast.success('Images exported successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'No images to export') {
        toast.error('No images to export');
      } else {
        console.error('Export failed:', error);
        toast.error('Failed to export images');
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!character) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{character.name}</h1>
                {character.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {character.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StorageIndicator />
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4 mr-1.5" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'canvas' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8"
                  onClick={() => setViewMode('canvas')}
                >
                  <PenTool className="h-4 w-4 mr-1.5" />
                  Canvas
                </Button>
                <Button
                  variant={viewMode === 'profile' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8"
                  onClick={() => setViewMode('profile')}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Profile
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export All
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {viewMode === 'grid' ? (
        <main className="container mx-auto px-4 py-6">
          {/* Upload Section */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-medium">Add Images</h2>
            </div>
            <ImageUploader
              characterId={characterId}
              onUploadComplete={handleUploadComplete}
            />
          </section>

          {/* Image Gallery */}
          <section>
            <h2 className="text-lg font-medium mb-4">Reference Images</h2>
            <ImageGrid
              key={refreshKey}
              characterId={characterId}
            />
          </section>
        </main>
      ) : viewMode === 'canvas' ? (
        <main className="h-[calc(100vh-73px)]">
          <MoodboardCanvas
            characterId={characterId}
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
