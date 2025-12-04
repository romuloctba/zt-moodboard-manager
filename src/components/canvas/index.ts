// Main component
export { MoodboardCanvas } from './MoodboardCanvas';

// Sub-components (for advanced use cases)
export {
  CanvasContent,
  CanvasImage,
  ImageSidebar,
  SelectionControls,
  ZoomControls,
} from './components';

// Hooks (for custom implementations)
export {
  useCanvasImages,
  useCanvasItems,
  useCanvasViewport,
  useItemInteraction,
} from './hooks';

// Types and constants
export type { ImageWithUrl, ResizeCorner, ItemInteractionState } from './types';
export {
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_VIEWPORT,
  CANVAS_SIZE,
  DEFAULT_IMAGE_MAX_SIZE,
  ROTATION_STEP,
  MIN_IMAGE_SIZE,
} from './constants';
