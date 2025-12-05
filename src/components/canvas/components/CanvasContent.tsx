'use client';

import { TransformComponent, useTransformContext } from 'react-zoom-pan-pinch';
import type { CanvasImageItem, CanvasViewport } from '@/types';
import type { ImageWithUrl } from '../types';
import { CANVAS_SIZE } from '../constants';
import { CanvasImage } from './CanvasImage';
import { ZoomControls } from './ZoomControls';

interface CanvasContentProps {
  items: CanvasImageItem[];
  selectedId: string | null;
  viewport: CanvasViewport;
  onSelectItem: (id: string | null) => void;
  onBringToFront: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, width: number, height: number) => void;
  onUpdateRotation: (id: string, rotation: number) => void;
  onDraggingChange: (isDragging: boolean) => void;
  getImageUrl: (imageId: string) => string | undefined;
  getImageInfo: (imageId: string) => ImageWithUrl | undefined;
  emptyStateTitle: string;
  emptyStateHint: string;
  // Export props
  onExportCanvas?: () => void;
  isExporting?: boolean;
  exportLabel?: string;
}

/**
 * Canvas content including the transform component, images, and zoom controls
 * Must be rendered inside a TransformWrapper context
 */
export function CanvasContent({
  items,
  selectedId,
  viewport,
  onSelectItem,
  onBringToFront,
  onUpdatePosition,
  onUpdateSize,
  onUpdateRotation,
  onDraggingChange,
  getImageUrl,
  getImageInfo,
  emptyStateTitle,
  emptyStateHint,
  onExportCanvas,
  isExporting,
  exportLabel,
}: CanvasContentProps) {
  const { transformState } = useTransformContext();
  const currentScale = transformState?.scale ?? viewport.zoom;

  const handleItemSelect = (id: string) => {
    onSelectItem(id);
    onBringToFront(id);
  };

  return (
    <>
      <TransformComponent
        wrapperStyle={{
          width: '100%',
          height: '100%',
        }}
        contentStyle={{
          width: '100%',
          height: '100%',
        }}
      >
        {/* Canvas content */}
        <div
          className="relative"
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
          onClick={() => onSelectItem(null)}
        >
          {items.map((item) => (
            <CanvasImage
              key={item.id}
              item={item}
              imageUrl={getImageUrl(item.imageId)}
              imageInfo={getImageInfo(item.imageId)}
              isSelected={selectedId === item.id}
              onSelect={() => handleItemSelect(item.id)}
              onPositionChange={(x, y) => onUpdatePosition(item.id, x, y)}
              onSizeChange={(w, h) => onUpdateSize(item.id, w, h)}
              onRotationChange={(r) => onUpdateRotation(item.id, r)}
              onDragStart={() => onDraggingChange(true)}
              onDragEnd={() => onDraggingChange(false)}
              zoom={currentScale}
            />
          ))}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium">{emptyStateTitle}</p>
                <p className="text-sm">{emptyStateHint}</p>
              </div>
            </div>
          )}
        </div>
      </TransformComponent>

      {/* Zoom controls */}
      <ZoomControls
        zoom={currentScale}
        onExport={onExportCanvas}
        isExporting={isExporting}
        canExport={items.length > 0}
        exportLabel={exportLabel}
      />
    </>
  );
}
