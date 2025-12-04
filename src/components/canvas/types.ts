import type { MoodboardImage } from '@/types';

/**
 * Extended image type with pre-loaded thumbnail URL
 */
export interface ImageWithUrl extends MoodboardImage {
  thumbnailUrl?: string;
}

/**
 * Corner direction for resize handles
 */
export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Interaction state for canvas items
 */
export interface ItemInteractionState {
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
}
