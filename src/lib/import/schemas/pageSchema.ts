/**
 * Page Import Schema
 *
 * Zod validation schema for page JSON import.
 * Includes nested validation for panels and dialogues.
 */

import { z } from 'zod';
import type { DialogueType } from '@/types';

/**
 * Valid dialogue types
 */
const DIALOGUE_TYPES: DialogueType[] = ['speech', 'thought', 'caption', 'sfx', 'narration', 'whisper'];

/**
 * Dialogue schema - conversation/narration within a panel
 */
export const dialogueImportSchema = z.object({
  characterName: z
    .string()
    .min(1, 'Character name is required for dialogue')
    .max(100, 'Character name must be 100 characters or less'),
  characterId: z
    .string()
    .max(100, 'Character ID must be 100 characters or less')
    .optional(),
  type: z.enum(DIALOGUE_TYPES as [DialogueType, ...DialogueType[]], {
    error: `Dialogue type must be one of: ${DIALOGUE_TYPES.join(', ')}`,
  }),
  text: z
    .string()
    .min(1, 'Dialogue text is required')
    .max(2000, 'Dialogue text must be 2000 characters or less'),
  direction: z
    .string()
    .max(500, 'Direction must be 500 characters or less')
    .optional(),
}).strict();

/**
 * Panel schema - individual comic panel within a page
 */
export const panelImportSchema = z.object({
  description: z
    .string()
    .max(2000, 'Panel description must be 2000 characters or less')
    .optional(),
  cameraAngle: z
    .string()
    .max(100, 'Camera angle must be 100 characters or less')
    .optional(),
  characters: z
    .array(z.string().max(100, 'Each character name must be 100 characters or less'))
    .max(20, 'Maximum 20 characters per panel')
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional(),
  dialogues: z
    .array(dialogueImportSchema)
    .max(20, 'Maximum 20 dialogues per panel')
    .optional(),
}).strict();

/**
 * Main page import schema
 */
export const pageImportSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  goal: z
    .string()
    .max(1000, 'Goal must be 1000 characters or less')
    .optional(),
  setting: z
    .string()
    .max(500, 'Setting must be 500 characters or less')
    .optional(),
  timeOfDay: z
    .string()
    .max(100, 'Time of day must be 100 characters or less')
    .optional(),
  mood: z
    .string()
    .max(100, 'Mood must be 100 characters or less')
    .optional(),
  notes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or less')
    .optional(),
  panels: z
    .array(panelImportSchema)
    .max(50, 'Maximum 50 panels per page')
    .optional(),
}).strict();

/**
 * Inferred types from schemas
 */
export type DialogueImportData = z.infer<typeof dialogueImportSchema>;
export type PanelImportData = z.infer<typeof panelImportSchema>;
export type PageImportData = z.infer<typeof pageImportSchema>;

/**
 * Validate page import data
 * Returns parsed data or array of error messages
 */
export function validatePageImport(data: unknown): {
  success: true;
  data: PageImportData;
} | {
  success: false;
  errors: string[];
} {
  const result = pageImportSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
    return `${path}${e.message}`;
  });

  return { success: false, errors };
}
