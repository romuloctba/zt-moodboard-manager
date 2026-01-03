/**
 * Character Import Schema Tests
 *
 * Tests for character JSON validation schema.
 * ID prefix: ICS (Import Character Schema)
 */

import { describe, it, expect } from 'vitest';
import {
  characterImportSchema,
  characterProfileSchema,
  characterMetadataSchema,
  validateCharacterImport,
} from '@/lib/import/schemas/characterSchema';

describe('Character Import Schema', () => {
  describe('characterImportSchema - Basic Fields', () => {
    it('ICS-001: should accept valid character with all fields', () => {
      const validCharacter = {
        name: 'Test Character',
        description: 'A test description',
        tags: ['hero', 'main'],
        profile: {
          age: '25',
          role: 'Protagonist',
          personality: ['brave', 'kind'],
          abilities: ['sword fighting'],
          backstory: 'Born in a small village...',
          customFields: { 'hair color': 'black' },
        },
        metadata: {
          archetype: 'Hero',
          version: '1.0',
          inspirations: ['Aragorn', 'Geralt'],
        },
      };

      const result = characterImportSchema.safeParse(validCharacter);
      expect(result.success).toBe(true);
    });

    it('ICS-002: should accept character with only required name field', () => {
      const minimalCharacter = { name: 'Minimal Character' };

      const result = characterImportSchema.safeParse(minimalCharacter);
      expect(result.success).toBe(true);
    });

    it('ICS-003: should reject character without name', () => {
      const invalidCharacter = { description: 'No name provided' };

      const result = characterImportSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });

    it('ICS-004: should reject empty name', () => {
      const invalidCharacter = { name: '' };

      const result = characterImportSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });

    it('ICS-005: should reject name exceeding 100 characters', () => {
      const invalidCharacter = { name: 'a'.repeat(101) };

      const result = characterImportSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });

    it('ICS-006: should reject description exceeding 1000 characters', () => {
      const invalidCharacter = {
        name: 'Test',
        description: 'a'.repeat(1001),
      };

      const result = characterImportSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });

    it('ICS-007: should reject more than 20 tags', () => {
      const invalidCharacter = {
        name: 'Test',
        tags: Array(21).fill('tag'),
      };

      const result = characterImportSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });

    it('ICS-008: should reject tag exceeding 50 characters', () => {
      const invalidCharacter = {
        name: 'Test',
        tags: ['a'.repeat(51)],
      };

      const result = characterImportSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });

    it('ICS-009: should reject unknown/extra fields (strict mode)', () => {
      const invalidCharacter = {
        name: 'Test',
        unknownField: 'should fail',
      };

      const result = characterImportSchema.safeParse(invalidCharacter);
      expect(result.success).toBe(false);
    });
  });

  describe('characterProfileSchema - Profile Fields', () => {
    it('ICS-010: should accept valid profile with all fields', () => {
      const validProfile = {
        age: '25',
        role: 'Protagonist',
        personality: ['brave', 'kind'],
        abilities: ['sword fighting'],
        backstory: 'Born in a small village...',
        customFields: { 'hair color': 'black' },
      };

      const result = characterProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('ICS-011: should accept empty profile', () => {
      const result = characterProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('ICS-012: should reject age exceeding 50 characters', () => {
      const invalidProfile = { age: 'a'.repeat(51) };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-013: should reject role exceeding 100 characters', () => {
      const invalidProfile = { role: 'a'.repeat(101) };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-014: should reject more than 10 personality traits', () => {
      const invalidProfile = {
        personality: Array(11).fill('trait'),
      };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-015: should reject personality trait exceeding 50 characters', () => {
      const invalidProfile = {
        personality: ['a'.repeat(51)],
      };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-016: should reject more than 20 abilities', () => {
      const invalidProfile = {
        abilities: Array(21).fill('ability'),
      };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-017: should reject ability exceeding 100 characters', () => {
      const invalidProfile = {
        abilities: ['a'.repeat(101)],
      };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-018: should reject backstory exceeding 5000 characters', () => {
      const invalidProfile = {
        backstory: 'a'.repeat(5001),
      };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-019: should reject custom field key exceeding 50 characters', () => {
      const invalidProfile = {
        customFields: { ['a'.repeat(51)]: 'value' },
      };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('ICS-020: should reject custom field value exceeding 500 characters', () => {
      const invalidProfile = {
        customFields: { key: 'a'.repeat(501) },
      };

      const result = characterProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('characterMetadataSchema - Metadata Fields', () => {
    it('ICS-021: should accept valid metadata with all fields', () => {
      const validMetadata = {
        archetype: 'Hero',
        version: '1.0',
        inspirations: ['Aragorn', 'Geralt'],
      };

      const result = characterMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('ICS-022: should accept empty metadata', () => {
      const result = characterMetadataSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('ICS-023: should reject archetype exceeding 100 characters', () => {
      const invalidMetadata = { archetype: 'a'.repeat(101) };

      const result = characterMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });

    it('ICS-024: should reject version exceeding 20 characters', () => {
      const invalidMetadata = { version: 'a'.repeat(21) };

      const result = characterMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });

    it('ICS-025: should reject more than 10 inspirations', () => {
      const invalidMetadata = {
        inspirations: Array(11).fill('inspiration'),
      };

      const result = characterMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });

    it('ICS-026: should reject inspiration exceeding 100 characters', () => {
      const invalidMetadata = {
        inspirations: ['a'.repeat(101)],
      };

      const result = characterMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCharacterImport - Validation Function', () => {
    it('ICS-027: should return success=true with data for valid input', () => {
      const validCharacter = {
        name: 'Test Character',
        description: 'A test description',
      };

      const result = validateCharacterImport(validCharacter);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Character');
        expect(result.data.description).toBe('A test description');
      }
    });

    it('ICS-028: should return success=false with errors for invalid input', () => {
      const invalidCharacter = { description: 'Missing name' };

      const result = validateCharacterImport(invalidCharacter);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('name');
      }
    });

    it('ICS-029: should return formatted error paths', () => {
      const invalidCharacter = {
        name: 'Test',
        profile: {
          age: 'a'.repeat(51), // exceeds limit
        },
      };

      const result = validateCharacterImport(invalidCharacter);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('profile.age'))).toBe(true);
      }
    });

    it('ICS-030: should handle non-object input gracefully', () => {
      const invalidInputs = [null, undefined, 'string', 123, [], true];

      for (const input of invalidInputs) {
        const result = validateCharacterImport(input);
        expect(result.success).toBe(false);
      }
    });
  });
});
