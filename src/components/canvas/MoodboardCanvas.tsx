'use client';

import { useState, useCallback, useEffect } from 'react';
import { TransformWrapper } from 'react-zoom-pan-pinch';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasState } from '@/types';

import { MIN_ZOOM, MAX_ZOOM, ROTATION_STEP } from './constants';
import { useCanvasImages, useCanvasItems, useCanvasViewport, useCanvasExport } from './hooks';
import { CanvasContent, ImageSidebar, SelectionControls } from './components';

interface MoodboardCanvasProps {
  characterId: string;
  canvasState?: CanvasState;
  onCanvasChange: (state: CanvasState) => void;
  className?: string;
}

/**
 * Main moodboard canvas component - orchestrates state and renders child components
 */
export function MoodboardCanvas({
  characterId,
  canvasState,
  onCanvasChange,
  className,
}: MoodboardCanvasProps) {
  const t = useTranslations('characters.canvas');

  // State for disabling canvas panning during item interactions
  const [isDraggingItem, setIsDraggingItem] = useState(false);

  // Custom hooks for managing canvas state
  const { images, loading, getImageUrl, getImageInfo } = useCanvasImages(
    characterId,
    t('toast.loadFailed')
  );

  const { viewport, handleTransformChange } = useCanvasViewport({
    initialViewport: canvasState?.viewport,
  });

  const {
    items,
    selectedId,
    selectedItem,
    setSelectedId,
    addItem,
    updateItemPosition,
    updateItemSize,
    updateItemRotation,
    rotateItem,
    resetItemRotation,
    toggleItemLock,
    deleteItem,
    bringToFront,
  } = useCanvasItems(t('toast.imageAlreadyOnCanvas'), {
    initialItems: canvasState?.items,
  });

  // Canvas export hook
  const { exportCanvas, isExporting } = useCanvasExport({
    items,
    getImageUrl,
    filename: `moodboard-${characterId}`,
  });

  // Save canvas state when it changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const newState: CanvasState = {
        viewport,
        items,
        updatedAt: new Date(),
      };
      onCanvasChange(newState);
    }, 500);

    return () => clearTimeout(timeout);
  }, [viewport, items, onCanvasChange]);

  // Handler for adding images from sidebar
  const handleAddImage = useCallback(
    (image: (typeof images)[0]) => {
      addItem(image, viewport);
    },
    [addItem, viewport]
  );

  // Get image IDs currently on canvas for sidebar
  const onCanvasImageIds = items.map((item) => item.imageId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('relative flex h-full', className)}>
      {/* Image sidebar */}
      <ImageSidebar
        images={images}
        onCanvasImageIds={onCanvasImageIds}
        onAddImage={handleAddImage}
        labels={{
          title: t('sidebar.title'),
          hint: t('sidebar.hint'),
          onCanvas: t('sidebar.onCanvas'),
          noImages: t('sidebar.noImages'),
        }}
      />

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden bg-neutral-900">
        <TransformWrapper
          initialScale={viewport.zoom}
          initialPositionX={viewport.x}
          initialPositionY={viewport.y}
          minScale={MIN_ZOOM}
          maxScale={MAX_ZOOM}
          limitToBounds={false}
          onTransformed={handleTransformChange}
          panning={{
            disabled: isDraggingItem,
            velocityDisabled: true,
          }}
          pinch={{ disabled: isDraggingItem }}
          wheel={{ smoothStep: 0.05 }}
          doubleClick={{ disabled: true }}
        >
          <CanvasContent
            items={items}
            selectedId={selectedId}
            viewport={viewport}
            onSelectItem={setSelectedId}
            onBringToFront={bringToFront}
            onUpdatePosition={updateItemPosition}
            onUpdateSize={updateItemSize}
            onUpdateRotation={updateItemRotation}
            onDraggingChange={setIsDraggingItem}
            getImageUrl={getImageUrl}
            getImageInfo={getImageInfo}
            emptyStateTitle={t('empty.title')}
            emptyStateHint={t('empty.hint')}
            onExportCanvas={exportCanvas}
            isExporting={isExporting}
            exportLabel={t('controls.exportCanvas')}
          />
        </TransformWrapper>

        {/* Selected item controls */}
        {selectedItem && (
          <SelectionControls
            item={selectedItem}
            onRotateLeft={() => rotateItem(selectedItem.id, -ROTATION_STEP)}
            onRotateRight={() => rotateItem(selectedItem.id, ROTATION_STEP)}
            onResetRotation={() => resetItemRotation(selectedItem.id)}
            onToggleLock={() => toggleItemLock(selectedItem.id)}
            onDelete={() => deleteItem(selectedItem.id)}
            labels={{
              rotateLeft: t('controls.rotateLeft'),
              rotateRight: t('controls.rotateRight'),
              resetRotation: t('controls.resetRotation'),
              lock: t('controls.lock'),
              unlock: t('controls.unlock'),
              remove: t('controls.remove'),
            }}
          />
        )}
      </div>
    </div>
  );
}
