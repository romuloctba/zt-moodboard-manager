'use client';

import { useState, useCallback } from 'react';
import type { CanvasViewport } from '@/types';
import { DEFAULT_VIEWPORT } from '../constants';

interface UseCanvasViewportOptions {
  initialViewport?: CanvasViewport;
}

interface TransformState {
  scale: number;
  positionX: number;
  positionY: number;
}

interface UseCanvasViewportReturn {
  viewport: CanvasViewport;
  handleTransformChange: (ref: { state: TransformState }) => void;
}

/**
 * Hook to manage canvas viewport state (pan/zoom)
 */
export function useCanvasViewport(
  options: UseCanvasViewportOptions = {}
): UseCanvasViewportReturn {
  const [viewport, setViewport] = useState<CanvasViewport>(
    options.initialViewport || DEFAULT_VIEWPORT
  );

  const handleTransformChange = useCallback((ref: { state: TransformState }) => {
    setViewport({
      zoom: ref.state.scale,
      x: ref.state.positionX,
      y: ref.state.positionY,
    });
  }, []);

  return {
    viewport,
    handleTransformChange,
  };
}
