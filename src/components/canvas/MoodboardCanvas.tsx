'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent, useControls, useTransformContext } from 'react-zoom-pan-pinch';
import { useTranslations } from 'next-intl';
import { Loader2, ZoomIn, ZoomOut, Maximize, Lock, Unlock, Trash2, RotateCcw, RotateCw, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { imageRepository } from '@/lib/db/repositories';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MoodboardImage, CanvasState, CanvasImageItem, CanvasViewport } from '@/types';

interface MoodboardCanvasProps {
  characterId: string;
  canvasState?: CanvasState;
  onCanvasChange: (state: CanvasState) => void;
  className?: string;
}

interface ImageWithUrl extends MoodboardImage {
  thumbnailUrl?: string;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;

const DEFAULT_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

// Zoom controls component that uses the transform context
function ZoomControls({ zoom }: { zoom: number }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur rounded-lg p-1 z-10">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => resetTransform()}>
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Canvas content component that accesses transform state via context
interface CanvasContentProps {
  items: CanvasImageItem[];
  selectedId: string | null;
  viewport: CanvasViewport;
  setSelectedId: (id: string | null) => void;
  bringToFront: (id: string) => void;
  updateItemPosition: (id: string, x: number, y: number) => void;
  updateItemSize: (id: string, width: number, height: number) => void;
  setItems: React.Dispatch<React.SetStateAction<CanvasImageItem[]>>;
  setIsDraggingItem: (dragging: boolean) => void;
  getImageUrl: (imageId: string) => string | undefined;
  getImageInfo: (imageId: string) => ImageWithUrl | undefined;
  t: ReturnType<typeof useTranslations<'characters.canvas'>>;
}

function CanvasContent({
  items,
  selectedId,
  viewport,
  setSelectedId,
  bringToFront,
  updateItemPosition,
  updateItemSize,
  setItems,
  setIsDraggingItem,
  getImageUrl,
  getImageInfo,
  t,
}: CanvasContentProps) {
  const { transformState } = useTransformContext();
  const currentScale = transformState?.scale ?? viewport.zoom;

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
          className="relative w-[5000px] h-[5000px]"
          onClick={() => setSelectedId(null)}
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        >
          {items.map(item => (
            <CanvasImage
              key={item.id}
              item={item}
              imageUrl={getImageUrl(item.imageId)}
              imageInfo={getImageInfo(item.imageId)}
              isSelected={selectedId === item.id}
              onSelect={() => {
                setSelectedId(item.id);
                bringToFront(item.id);
              }}
              onPositionChange={(x, y) => updateItemPosition(item.id, x, y)}
              onSizeChange={(w, h) => updateItemSize(item.id, w, h)}
              onRotationChange={(r) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, rotation: r } : i))}
              onDragStart={() => setIsDraggingItem(true)}
              onDragEnd={() => setIsDraggingItem(false)}
              zoom={currentScale}
            />
          ))}
          
          {/* Help text */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-muted-foreground">
                <p className="text-lg font-medium">{t('empty.title')}</p>
                <p className="text-sm">{t('empty.hint')}</p>
              </div>
            </div>
          )}
        </div>
      </TransformComponent>

      {/* Zoom controls */}
      <ZoomControls zoom={currentScale} />
    </>
  );
}

export function MoodboardCanvas({ 
  characterId, 
  canvasState, 
  onCanvasChange,
  className 
}: MoodboardCanvasProps) {
  const t = useTranslations('characters.canvas');
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Canvas state
  const [viewport, setViewport] = useState<CanvasViewport>(
    canvasState?.viewport || DEFAULT_VIEWPORT
  );
  const [items, setItems] = useState<CanvasImageItem[]>(canvasState?.items || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDraggingItem, setIsDraggingItem] = useState(false);

  // Track highest z-index
  const maxZIndex = useRef(items.length > 0 ? Math.max(...items.map(i => i.zIndex)) : 0);

  // Load available images
  useEffect(() => {
    async function loadImages() {
      try {
        setLoading(true);
        const characterImages = await imageRepository.getByCharacterId(characterId);
        
        const imagesWithUrls = await Promise.all(
          characterImages.map(async (img) => {
            const thumbnailUrl = await imageRepository.getThumbnailUrl(img);
            return { ...img, thumbnailUrl: thumbnailUrl || undefined };
          })
        );
        
        setImages(imagesWithUrls);
      } catch (error) {
        console.error('Failed to load images:', error);
        toast.error(t('toast.loadFailed'));
      } finally {
        setLoading(false);
      }
    }
    
    loadImages();
  }, [characterId, t]);

  // Save canvas state when it changes
  const saveCanvasState = useCallback(() => {
    const newState: CanvasState = {
      viewport,
      items,
      updatedAt: new Date(),
    };
    onCanvasChange(newState);
  }, [viewport, items, onCanvasChange]);

  // Debounced save
  useEffect(() => {
    const timeout = setTimeout(saveCanvasState, 500);
    return () => clearTimeout(timeout);
  }, [saveCanvasState]);

  // Add image to canvas
  const addImageToCanvas = useCallback((image: ImageWithUrl) => {
    // Check if already on canvas
    if (items.some(item => item.imageId === image.id)) {
      toast.error(t('toast.imageAlreadyOnCanvas'));
      return;
    }

    maxZIndex.current += 1;
    
    // Calculate size (max 300px on longest side, maintain aspect ratio)
    const maxSize = 300;
    let width = image.width;
    let height = image.height;
    
    if (width > height) {
      if (width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
    }

    const newItem: CanvasImageItem = {
      id: crypto.randomUUID(),
      imageId: image.id,
      x: -viewport.x / viewport.zoom + 100 + Math.random() * 200,
      y: -viewport.y / viewport.zoom + 100 + Math.random() * 200,
      width,
      height,
      rotation: 0,
      zIndex: maxZIndex.current,
    };

    setItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  }, [items, viewport, t]);

  // Update item position
  const updateItemPosition = useCallback((id: string, x: number, y: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, x, y } : item
    ));
  }, []);

  // Update item size
  const updateItemSize = useCallback((id: string, width: number, height: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, width, height } : item
    ));
  }, []);

  // Bring item to front
  const bringToFront = useCallback((id: string) => {
    maxZIndex.current += 1;
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, zIndex: maxZIndex.current } : item
    ));
  }, []);

  // Delete item
  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  // Toggle item lock
  const toggleLock = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, locked: !item.locked } : item
    ));
  }, []);

  // Rotate item
  const rotateItem = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, rotation: (item.rotation + delta) % 360 } : item
    ));
  }, []);

  // Get image URL by ID
  const getImageUrl = useCallback((imageId: string) => {
    return images.find(img => img.id === imageId)?.thumbnailUrl;
  }, [images]);

  // Get image info
  const getImageInfo = useCallback((imageId: string) => {
    return images.find(img => img.id === imageId);
  }, [images]);

  const selectedItem = items.find(i => i.id === selectedId);

  // Handle transform change from react-zoom-pan-pinch
  const handleTransformChange = useCallback((ref: { state: { scale: number; positionX: number; positionY: number } }) => {
    setViewport({
      zoom: ref.state.scale,
      x: ref.state.positionX,
      y: ref.state.positionY,
    });
  }, []);

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
      <div className="w-48 border-r bg-background/50 flex flex-col">
        <div className="p-2 border-b">
          <h3 className="text-sm font-medium">{t('sidebar.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('sidebar.hint')}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {images.map(image => {
            const isOnCanvas = items.some(item => item.imageId === image.id);
            return (
              <div
                key={image.id}
                className={cn(
                  'relative rounded-md overflow-hidden cursor-pointer border-2 transition-colors',
                  isOnCanvas ? 'border-primary/50 opacity-50' : 'border-transparent hover:border-primary'
                )}
                onClick={() => addImageToCanvas(image)}
              >
                {image.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.thumbnailUrl}
                    alt={image.originalName}
                    className="w-full h-auto"
                    draggable={false}
                  />
                )}
                {isOnCanvas && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <span className="text-xs font-medium">{t('sidebar.onCanvas')}</span>
                  </div>
                )}
              </div>
            );
          })}
          {images.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('sidebar.noImages')}
            </p>
          )}
        </div>
      </div>

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
            setSelectedId={setSelectedId}
            bringToFront={bringToFront}
            updateItemPosition={updateItemPosition}
            updateItemSize={updateItemSize}
            setItems={setItems}
            setIsDraggingItem={setIsDraggingItem}
            getImageUrl={getImageUrl}
            getImageInfo={getImageInfo}
            t={t}
          />
        </TransformWrapper>

        {/* Selected item controls */}
        {selectedItem && (
          <TooltipProvider delayDuration={300}>
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-background/80 backdrop-blur rounded-lg p-1 z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => rotateItem(selectedItem.id, -15)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('controls.rotateLeft')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => rotateItem(selectedItem.id, 15)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('controls.rotateRight')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, rotation: 0 } : i))}
                    disabled={selectedItem.rotation === 0}
                  >
                    <Circle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('controls.resetRotation')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => toggleLock(selectedItem.id)}
                  >
                    {selectedItem.locked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{selectedItem.locked ? t('controls.unlock') : t('controls.lock')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteItem(selectedItem.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('controls.remove')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

// Individual canvas image component with pointer events for touch support
interface CanvasImageProps {
  item: CanvasImageItem;
  imageUrl?: string;
  imageInfo?: ImageWithUrl;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onRotationChange: (rotation: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  zoom: number;
}

function CanvasImage({
  item,
  imageUrl,
  imageInfo,
  isSelected,
  onSelect,
  onPositionChange,
  onSizeChange,
  onRotationChange,
  onDragStart,
  onDragEnd,
  zoom,
}: CanvasImageProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Drag handler using pointer events
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (item.locked) return;
    e.stopPropagation();
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    onDragStart();
    onSelect();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startItemX = item.x;
    const startItemY = item.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      onPositionChange(startItemX + dx, startItemY + dy);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      onDragEnd();
      target.releasePointerCapture(e.pointerId);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }, [item, zoom, onPositionChange, onDragStart, onDragEnd, onSelect]);

  // Resize handler using pointer events
  const handleResize = useCallback((e: React.PointerEvent, corner: string) => {
    if (item.locked) return;
    e.stopPropagation();
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    setIsResizing(true);
    onDragStart(); // Disable canvas panning during resize
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = item.width;
    const startHeight = item.height;
    const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : 1;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (corner.includes('e')) newWidth = Math.max(50, startWidth + dx);
      if (corner.includes('w')) newWidth = Math.max(50, startWidth - dx);
      if (corner.includes('s')) newHeight = Math.max(50, startHeight + dy);
      if (corner.includes('n')) newHeight = Math.max(50, startHeight - dy);
      
      // Maintain aspect ratio with shift key (desktop) or always on touch
      if (moveEvent.shiftKey || moveEvent.pointerType === 'touch') {
        newHeight = newWidth / aspectRatio;
      }
      
      onSizeChange(newWidth, newHeight);
    };

    const onPointerUp = () => {
      setIsResizing(false);
      onDragEnd();
      target.releasePointerCapture(e.pointerId);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }, [item, imageInfo, zoom, onSizeChange, onDragStart, onDragEnd]);

  // Rotation handler using pointer events
  const handleRotate = useCallback((e: React.PointerEvent) => {
    if (item.locked) return;
    e.stopPropagation();
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    setIsRotating(true);
    onDragStart(); // Disable canvas panning during rotation
    
    // Get center of the element
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate initial angle
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const startRotation = item.rotation;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
      let newRotation = startRotation + (currentAngle - startAngle);
      
      // Snap to 15° increments when holding shift (desktop only)
      if (moveEvent.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
      
      onRotationChange(newRotation);
    };

    const onPointerUp = () => {
      setIsRotating(false);
      onDragEnd();
      target.releasePointerCapture(e.pointerId);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }, [item, onRotationChange, onDragStart, onDragEnd]);

  return (
    <div
      ref={elementRef}
      className={cn(
        'absolute select-none',
        isDragging && 'cursor-grabbing',
        !isDragging && !item.locked && 'cursor-grab',
        item.locked && 'cursor-not-allowed'
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
        transform: `rotate(${item.rotation}deg)`,
        touchAction: 'none',
      }}
      onPointerDown={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Image */}
      <div
        className={cn(
          'w-full h-full rounded-md overflow-hidden shadow-lg',
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-transparent'
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        )}
      </div>

      {/* Resize handles (only when selected and not locked) */}
      {isSelected && !item.locked && (
        <>
          <div
            className="absolute -right-6 -bottom-6 w-5 h-5 bg-primary rounded-sm cursor-se-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResize(e, 'se')}
          />
          <div
            className="absolute -left-6 -bottom-6 w-5 h-5 bg-primary rounded-sm cursor-sw-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResize(e, 'sw')}
          />
          <div
            className="absolute -right-6 -top-6 w-5 h-5 bg-primary rounded-sm cursor-ne-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResize(e, 'ne')}
          />
          <div
            className="absolute -left-6 -top-6 w-5 h-5 bg-primary rounded-sm cursor-nw-resize"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResize(e, 'nw')}
          />
          {/* Rotation handle */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-12 flex flex-col items-center",
              isRotating && "cursor-grabbing"
            )}
            style={{ touchAction: 'none' }}
            onPointerDown={handleRotate}
          >
            <div 
              className={cn(
                "w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-grab",
                isRotating && "cursor-grabbing ring-2 ring-primary/50"
              )}
            >
              <RotateCcw className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="w-0.5 h-4 bg-primary" />
          </div>
        </>
      )}

      {/* Lock indicator */}
      {item.locked && (
        <div className="absolute top-1 right-1 bg-background/80 rounded p-0.5">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      
      {/* Visual feedback for resize/rotate */}
      {(isResizing || isRotating) && (
        <div className="absolute inset-0 border-2 border-primary border-dashed rounded-md pointer-events-none" />
      )}
    </div>
  );
}
