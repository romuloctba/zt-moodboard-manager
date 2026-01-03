/**
 * JSON Import Module
 *
 * Public API for importing characters and pages from JSON data.
 * These services use existing repository methods to ensure full
 * compatibility with sync and backup features.
 */

// Types
export type {
  ImportResult,
  CharacterImportResult,
  PageImportResult,
  PageImportResultData,
  ImportOptions,
} from './types';

// Character Import
export {
  importCharacter,
  importCharacterFromString,
  validateCharacterJSON,
} from './services/characterImportService';

export type { CharacterImportData } from './schemas/characterSchema';

// Page Import
export {
  importPage,
  importPageFromString,
  validatePageJSON,
  getPageImportSummary,
} from './services/pageImportService';

export type {
  PageImportData,
  PanelImportData,
  DialogueImportData,
} from './schemas/pageSchema';

// Schema validation functions (for advanced use cases)
export { validateCharacterImport } from './schemas/characterSchema';
export { validatePageImport } from './schemas/pageSchema';
