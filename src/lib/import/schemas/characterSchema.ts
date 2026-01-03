/**
 * Character Import Schema
 *
 * Zod validation schema for character JSON import.
 * Validates structure and constraints before creating character entities.
 */

import { z } from 'zod';

/**
 * Character profile schema - personal details and traits
 */
export const characterProfileSchema = z.object({
  age: z.string().max(50, 'Age must be 50 characters or less').optional(),
  role: z.string().max(100, 'Role must be 100 characters or less').optional(),
  personality: z
    .array(z.string().max(50, 'Each personality trait must be 50 characters or less'))
    .max(10, 'Maximum 10 personality traits allowed')
    .optional(),
  abilities: z
    .array(z.string().max(100, 'Each ability must be 100 characters or less'))
    .max(20, 'Maximum 20 abilities allowed')
    .optional(),
  backstory: z.string().max(5000, 'Backstory must be 5000 characters or less').optional(),
  customFields: z
    .record(
      z.string().max(50, 'Custom field key must be 50 characters or less'),
      z.string().max(500, 'Custom field value must be 500 characters or less')
    )
    .optional(),
}).strict();

/**
 * Character metadata schema - supplementary information
 * Note: palette is excluded as images are only supported via UI upload
 */
export const characterMetadataSchema = z.object({
  archetype: z.string().max(100, 'Archetype must be 100 characters or less').optional(),
  version: z.string().max(20, 'Version must be 20 characters or less').optional(),
  inspirations: z
    .array(z.string().max(100, 'Each inspiration must be 100 characters or less'))
    .max(10, 'Maximum 10 inspirations allowed')
    .optional(),
}).strict();

/**
 * Main character import schema
 */
export const characterImportSchema = z.object({
  name: z
    .string()
    .min(1, 'Character name is required')
    .max(100, 'Character name must be 100 characters or less'),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  tags: z
    .array(z.string().max(50, 'Each tag must be 50 characters or less'))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  profile: characterProfileSchema.optional(),
  metadata: characterMetadataSchema.optional(),
}).strict();

/**
 * Inferred type from the schema
 */
export type CharacterImportData = z.infer<typeof characterImportSchema>;

/**
 * Validate character import data
 * Returns parsed data or array of error messages
 */
export function validateCharacterImport(data: unknown): {
  success: true;
  data: CharacterImportData;
} | {
  success: false;
  errors: string[];
} {
  const result = characterImportSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
    return `${path}${e.message}`;
  });

  return { success: false, errors };
}
