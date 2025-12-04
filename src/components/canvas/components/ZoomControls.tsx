'use client';

import { useControls } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ZoomControlsProps {
  zoom: number;
}

/**
 * Zoom control buttons for the canvas
 * Must be rendered inside a TransformWrapper context
 */
export function ZoomControls({ zoom }: ZoomControlsProps) {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur rounded-lg p-1 z-10">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => zoomOut()}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => zoomIn()}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => resetTransform()}
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
