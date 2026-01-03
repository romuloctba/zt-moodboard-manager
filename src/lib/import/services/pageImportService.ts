/**
 * Page Import Service
 *
 * Handles validation and creation of pages (with panels and dialogues) from JSON data.
 * Uses existing repository methods to ensure sync compatibility.
 */

import { scriptPageRepository, panelRepository } from '@/lib/db/repositories';
import { validatePageImport, type PageImportData, type PanelImportData } from '../schemas/pageSchema';
import type { PageImportResult, PageImportResultData } from '../types';
import type { Panel, ScriptPage } from '@/types';

/**
 * Import a page with panels and dialogues from JSON data
 *
 * @param editionId - The edition to append the page to
 * @param jsonData - Raw JSON data (will be validated)
 * @returns ImportResult with created page and panels or errors
 */
export async function importPage(
  editionId: string,
  jsonData: unknown
): Promise<PageImportResult> {
  // 1. Validate JSON against schema
  const validation = validatePageImport(jsonData);

  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const data = validation.data;

  try {
    // 2. Create page using existing repository (same path as manual creation)
    const page = await scriptPageRepository.create(editionId, {
      title: data.title,
      goal: data.goal,
      setting: data.setting,
    });

    // 3. Update page with additional fields if provided
    const pageUpdates: Partial<ScriptPage> = {};
    if (data.timeOfDay) pageUpdates.timeOfDay = data.timeOfDay;
    if (data.mood) pageUpdates.mood = data.mood;
    if (data.notes) pageUpdates.notes = data.notes;

    if (Object.keys(pageUpdates).length > 0) {
      await scriptPageRepository.updatePageInfo(page.id, pageUpdates);
    }

    // 4. Create panels with dialogues
    const createdPanels: Panel[] = [];

    if (data.panels && data.panels.length > 0) {
      for (const panelData of data.panels) {
        const panel = await createPanelWithDialogues(page.id, panelData);
        if (panel) {
          createdPanels.push(panel);
        }
      }
    }

    // 5. Fetch complete page with all updates
    const completePage = await scriptPageRepository.getById(page.id);

    if (!completePage) {
      return {
        success: false,
        errors: ['Failed to retrieve created page'],
      };
    }

    return {
      success: true,
      data: {
        page: completePage,
        panels: createdPanels,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      errors: [`Failed to create page: ${message}`],
    };
  }
}

/**
 * Create a panel with its dialogues
 * Internal helper function
 */
async function createPanelWithDialogues(
  pageId: string,
  panelData: PanelImportData
): Promise<Panel | null> {
  // Create panel using existing repository
  const panel = await panelRepository.create(pageId, {
    description: panelData.description,
    cameraAngle: panelData.cameraAngle,
  });

  // Update panel with additional fields if provided
  const panelUpdates: Partial<Panel> = {};
  if (panelData.characters && panelData.characters.length > 0) {
    panelUpdates.characters = panelData.characters;
  }
  if (panelData.notes) {
    panelUpdates.notes = panelData.notes;
  }

  if (Object.keys(panelUpdates).length > 0) {
    await panelRepository.updatePanelInfo(panel.id, panelUpdates);
  }

  // Add dialogues in order
  if (panelData.dialogues && panelData.dialogues.length > 0) {
    for (const dialogueData of panelData.dialogues) {
      await panelRepository.addDialogue(panel.id, {
        characterName: dialogueData.characterName,
        characterId: dialogueData.characterId,
        type: dialogueData.type,
        text: dialogueData.text,
        direction: dialogueData.direction,
      });
    }
  }

  // Return complete panel with dialogues
  const result = await panelRepository.getById(panel.id);
  return result ?? null;
}

/**
 * Parse JSON string and import page
 * Convenience method that handles JSON parsing errors
 *
 * @param editionId - The edition to append the page to
 * @param jsonString - JSON string to parse and import
 * @returns ImportResult with created page and panels or errors
 */
export async function importPageFromString(
  editionId: string,
  jsonString: string
): Promise<PageImportResult> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      errors: ['Invalid JSON format. Please check your JSON syntax.'],
    };
  }

  return importPage(editionId, parsed);
}

/**
 * Validate page JSON without importing
 * Useful for preview/validation before committing
 *
 * @param jsonData - Raw JSON data to validate
 * @returns Validation result with parsed data or errors
 */
export function validatePageJSON(jsonData: unknown): {
  valid: boolean;
  data?: PageImportData;
  errors?: string[];
} {
  const validation = validatePageImport(jsonData);

  if (validation.success) {
    return { valid: true, data: validation.data };
  }

  return { valid: false, errors: validation.errors };
}

/**
 * Get summary statistics from page import data
 * Useful for showing preview info to user
 */
export function getPageImportSummary(data: PageImportData): {
  panelCount: number;
  dialogueCount: number;
  hasTitle: boolean;
} {
  const panelCount = data.panels?.length ?? 0;
  const dialogueCount = data.panels?.reduce(
    (total: number, panel: PanelImportData) => total + (panel.dialogues?.length ?? 0),
    0
  ) ?? 0;

  return {
    panelCount,
    dialogueCount,
    hasTitle: Boolean(data.title),
  };
}
