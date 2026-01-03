/**
 * Character Import Service
 *
 * Handles validation and creation of characters from JSON data.
 * Uses existing repository methods to ensure sync compatibility.
 */

import { characterRepository } from '@/lib/db/repositories';
import { validateCharacterImport, type CharacterImportData } from '../schemas/characterSchema';
import type { CharacterImportResult } from '../types';
import type { Character } from '@/types';

/**
 * Import a character from JSON data
 *
 * @param projectId - The project to create the character in
 * @param jsonData - Raw JSON data (will be validated)
 * @returns ImportResult with created character or errors
 */
export async function importCharacter(
  projectId: string,
  jsonData: unknown
): Promise<CharacterImportResult> {
  // 1. Validate JSON against schema
  const validation = validateCharacterImport(jsonData);

  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const data = validation.data;

  try {
    // 2. Create character using existing repository (same path as manual creation)
    const character = await characterRepository.create(projectId, data.name);

    // 3. Build updates object for additional fields
    const updates: Partial<Character> = {};

    if (data.description) {
      updates.description = data.description;
    }

    if (data.tags && data.tags.length > 0) {
      updates.tags = data.tags;
    }

    // 4. Apply basic updates if any
    if (Object.keys(updates).length > 0) {
      await characterRepository.update(character.id, updates);
    }

    // 5. Update profile if provided
    if (data.profile && Object.keys(data.profile).length > 0) {
      await characterRepository.updateProfile(character.id, data.profile);
    }

    // 6. Update metadata if provided
    if (data.metadata && Object.keys(data.metadata).length > 0) {
      await characterRepository.updateMetadata(character.id, data.metadata);
    }

    // 7. Fetch complete character with all updates
    const completeCharacter = await characterRepository.getById(character.id);

    if (!completeCharacter) {
      return {
        success: false,
        errors: ['Failed to retrieve created character'],
      };
    }

    return {
      success: true,
      data: completeCharacter,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      errors: [`Failed to create character: ${message}`],
    };
  }
}

/**
 * Parse JSON string and import character
 * Convenience method that handles JSON parsing errors
 *
 * @param projectId - The project to create the character in
 * @param jsonString - JSON string to parse and import
 * @returns ImportResult with created character or errors
 */
export async function importCharacterFromString(
  projectId: string,
  jsonString: string
): Promise<CharacterImportResult> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      errors: ['Invalid JSON format. Please check your JSON syntax.'],
    };
  }

  return importCharacter(projectId, parsed);
}

/**
 * Validate character JSON without importing
 * Useful for preview/validation before committing
 *
 * @param jsonData - Raw JSON data to validate
 * @returns Validation result with parsed data or errors
 */
export function validateCharacterJSON(jsonData: unknown): {
  valid: boolean;
  data?: CharacterImportData;
  errors?: string[];
} {
  const validation = validateCharacterImport(jsonData);

  if (validation.success) {
    return { valid: true, data: validation.data };
  }

  return { valid: false, errors: validation.errors };
}
