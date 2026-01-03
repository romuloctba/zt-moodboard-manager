/**
 * JSON Import Types
 *
 * Shared types for the JSON import feature.
 * Used by character and page import services.
 */

import type { Character, ScriptPage, Panel } from '@/types';

/**
 * Result of an import operation
 */
export interface ImportResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Result of a character import operation
 */
export type CharacterImportResult = ImportResult<Character>;

/**
 * Result of a page import operation (includes created panels)
 */
export interface PageImportResultData {
  page: ScriptPage;
  panels: Panel[];
}

export type PageImportResult = ImportResult<PageImportResultData>;

/**
 * Options for import operations
 */
export interface ImportOptions {
  /** Skip validation (use with caution) */
  skipValidation?: boolean;
}
