'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
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
const ZOOM_STEP = 0.1;

const DEFAULT_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

export function MoodboardCanvas({ 
  characterId, 
  canvasState, 
  onCanvasChange,
  className 
}: MoodboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Canvas state
  const [viewport, setViewport] = useState<CanvasViewport>(
    canvasState?.viewport || DEFAULT_VIEWPORT
  );
  const [items, setItems] = useState<CanvasImageItem[]>(canvasState?.items || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
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
        toast.error('Failed to load images');
      } finally {
        setLoading(false);
      }
    }
    
    loadImages();
  }, [characterId]);

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

  // Canvas pan/zoom gestures
  useGesture(
    {
      onDrag: ({ delta: [dx, dy], event, pinching }) => {
        if (pinching || isDraggingItem) return;
        event.preventDefault();
        setIsDraggingCanvas(true);
        setViewport(prev => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      },
      onDragEnd: () => {
        setIsDraggingCanvas(false);
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const zoomDelta = dy > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setViewport(prev => ({
          ...prev,
          zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + zoomDelta)),
        }));
      },
      onPinch: ({ offset: [scale] }) => {
        setViewport(prev => ({
          ...prev,
          zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale)),
        }));
      },
    },
    {
      target: containerRef,
      drag: { filterTaps: true },
      wheel: { eventOptions: { passive: false } },
      pinch: { scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM } },
    }
  );

  // Add image to canvas
  const addImageToCanvas = useCallback((image: ImageWithUrl) => {
    // Check if already on canvas
    if (items.some(item => item.imageId === image.id)) {
      toast.error('Image already on canvas');
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
  }, [items, viewport]);

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

  // Zoom controls
  const zoomIn = () => setViewport(prev => ({ 
    ...prev, 
    zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP * 2) 
  }));
  
  const zoomOut = () => setViewport(prev => ({ 
    ...prev, 
    zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP * 2) 
  }));
  
  const resetView = () => setViewport(DEFAULT_VIEWPORT);

  // Get image URL by ID
  const getImageUrl = useCallback((imageId: string) => {
    return images.find(img => img.id === imageId)?.thumbnailUrl;
  }, [images]);

  // Get image aspect ratio
  const getImageInfo = useCallback((imageId: string) => {
    return images.find(img => img.id === imageId);
  }, [images]);

  const selectedItem = items.find(i => i.id === selectedId);

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
          <h3 className="text-sm font-medium">Images</h3>
          <p className="text-xs text-muted-foreground">Drag to canvas</p>
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
                    <span className="text-xs font-medium">On Canvas</span>
                  </div>
                )}
              </div>
            );
          })}
          {images.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No images uploaded yet
            </p>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden bg-neutral-900">
        {/* Canvas */}
        <div
          ref={containerRef}
          className={cn(
            'absolute inset-0',
            isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab'
          )}
          onClick={() => setSelectedId(null)}
        >
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${50 * viewport.zoom}px ${50 * viewport.zoom}px`,
              backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            }}
          />

          {/* Canvas items container */}
          <div
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: '0 0',
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
                zoom={viewport.zoom}
              />
            ))}
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(viewport.zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected item controls */}
        {selectedItem && (
          <TooltipProvider delayDuration={300}>
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-background/80 backdrop-blur rounded-lg p-1">
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
                  <p>Rotate -15°</p>
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
                  <p>Rotate +15°</p>
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
                  <p>Reset rotation</p>
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
                  <p>{selectedItem.locked ? 'Unlock' : 'Lock'}</p>
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
                  <p>Remove from canvas</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        {/* Help text */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Click images to add to canvas</p>
              <p className="text-sm">Drag to pan • Scroll to zoom</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual canvas image component
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], first, last, event }) => {
        if (item.locked) return;
        event.stopPropagation();
        
        if (first) {
          setIsDragging(true);
          onDragStart();
          onSelect();
        }
        
        onPositionChange(item.x + dx / zoom, item.y + dy / zoom);
        
        if (last) {
          setIsDragging(false);
          onDragEnd();
        }
      },
    },
    {
      target: elementRef,
      drag: { filterTaps: true },
    }
  );

  // Resize handler
  const handleResize = useCallback((e: React.MouseEvent, corner: string) => {
    if (item.locked) return;
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = item.width;
    const startHeight = item.height;
    const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (corner.includes('e')) newWidth = Math.max(50, startWidth + dx);
      if (corner.includes('w')) newWidth = Math.max(50, startWidth - dx);
      if (corner.includes('s')) newHeight = Math.max(50, startHeight + dy);
      if (corner.includes('n')) newHeight = Math.max(50, startHeight - dy);
      
      // Maintain aspect ratio with shift key
      if (moveEvent.shiftKey) {
        newHeight = newWidth / aspectRatio;
      }
      
      onSizeChange(newWidth, newHeight);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [item, imageInfo, zoom, onSizeChange]);

  // Rotation handler
  const handleRotate = useCallback((e: React.MouseEvent) => {
    if (item.locked) return;
    e.stopPropagation();
    e.preventDefault();
    
    setIsRotating(true);
    
    // Get center of the element
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate initial angle
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const startRotation = item.rotation;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
      let newRotation = startRotation + (currentAngle - startAngle);
      
      // Snap to 15° increments when holding shift
      if (moveEvent.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
      
      onRotationChange(newRotation);
    };

    const onMouseUp = () => {
      setIsRotating(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [item, onRotationChange]);

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
      }}
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
            className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-sm cursor-se-resize"
            onMouseDown={(e) => handleResize(e, 'se')}
          />
          <div
            className="absolute -left-1 -bottom-1 w-3 h-3 bg-primary rounded-sm cursor-sw-resize"
            onMouseDown={(e) => handleResize(e, 'sw')}
          />
          <div
            className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-sm cursor-ne-resize"
            onMouseDown={(e) => handleResize(e, 'ne')}
          />
          <div
            className="absolute -left-1 -top-1 w-3 h-3 bg-primary rounded-sm cursor-nw-resize"
            onMouseDown={(e) => handleResize(e, 'nw')}
          />
          {/* Rotation handle */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-8 flex flex-col items-center",
              isRotating && "cursor-grabbing"
            )}
            onMouseDown={handleRotate}
          >
            <div className="w-0.5 h-4 bg-primary" />
            <div 
              className={cn(
                "w-4 h-4 bg-primary rounded-full flex items-center justify-center cursor-grab",
                isRotating && "cursor-grabbing ring-2 ring-primary/50"
              )}
            >
              <RotateCcw className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          </div>
        </>
      )}

      {/* Lock indicator */}
      {item.locked && (
        <div className="absolute top-1 right-1 bg-background/80 rounded p-0.5">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
