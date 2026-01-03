/**
 * Page Import Schema Tests
 *
 * Tests for page, panel, and dialogue JSON validation schemas.
 * ID prefix: IPS (Import Page Schema)
 */

import { describe, it, expect } from 'vitest';
import {
  pageImportSchema,
  panelImportSchema,
  dialogueImportSchema,
  validatePageImport,
} from '@/lib/import/schemas/pageSchema';

describe('Page Import Schema', () => {
  describe('dialogueImportSchema - Dialogue Fields', () => {
    it('IPS-001: should accept valid dialogue with all fields', () => {
      const validDialogue = {
        characterName: 'John',
        characterId: 'char-123',
        type: 'speech',
        text: 'Hello, world!',
        direction: 'softly',
      };

      const result = dialogueImportSchema.safeParse(validDialogue);
      expect(result.success).toBe(true);
    });

    it('IPS-002: should accept dialogue with only required fields', () => {
      const minimalDialogue = {
        characterName: 'John',
        type: 'speech',
        text: 'Hello!',
      };

      const result = dialogueImportSchema.safeParse(minimalDialogue);
      expect(result.success).toBe(true);
    });

    it('IPS-003: should accept all valid dialogue types', () => {
      const validTypes = ['speech', 'thought', 'caption', 'sfx', 'narration', 'whisper'];

      for (const type of validTypes) {
        const dialogue = {
          characterName: 'Test',
          type,
          text: 'Test text',
        };
        const result = dialogueImportSchema.safeParse(dialogue);
        expect(result.success).toBe(true);
      }
    });

    it('IPS-004: should reject invalid dialogue type', () => {
      const invalidDialogue = {
        characterName: 'John',
        type: 'yelling',
        text: 'Hello!',
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });

    it('IPS-005: should reject dialogue without characterName', () => {
      const invalidDialogue = {
        type: 'speech',
        text: 'Hello!',
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });

    it('IPS-006: should reject dialogue with empty characterName', () => {
      const invalidDialogue = {
        characterName: '',
        type: 'speech',
        text: 'Hello!',
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });

    it('IPS-007: should reject dialogue without text', () => {
      const invalidDialogue = {
        characterName: 'John',
        type: 'speech',
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });

    it('IPS-008: should reject dialogue with empty text', () => {
      const invalidDialogue = {
        characterName: 'John',
        type: 'speech',
        text: '',
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });

    it('IPS-009: should reject text exceeding 2000 characters', () => {
      const invalidDialogue = {
        characterName: 'John',
        type: 'speech',
        text: 'a'.repeat(2001),
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });

    it('IPS-010: should reject characterName exceeding 100 characters', () => {
      const invalidDialogue = {
        characterName: 'a'.repeat(101),
        type: 'speech',
        text: 'Hello!',
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });

    it('IPS-011: should reject direction exceeding 500 characters', () => {
      const invalidDialogue = {
        characterName: 'John',
        type: 'speech',
        text: 'Hello!',
        direction: 'a'.repeat(501),
      };

      const result = dialogueImportSchema.safeParse(invalidDialogue);
      expect(result.success).toBe(false);
    });
  });

  describe('panelImportSchema - Panel Fields', () => {
    it('IPS-012: should accept valid panel with all fields', () => {
      const validPanel = {
        description: 'A wide shot of the city',
        cameraAngle: 'wide',
        characters: ['char-1', 'char-2'],
        notes: 'Important scene',
        dialogues: [
          {
            characterName: 'John',
            type: 'speech',
            text: 'Hello!',
          },
        ],
      };

      const result = panelImportSchema.safeParse(validPanel);
      expect(result.success).toBe(true);
    });

    it('IPS-013: should accept empty panel (all fields optional)', () => {
      const result = panelImportSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('IPS-014: should reject description exceeding 2000 characters', () => {
      const invalidPanel = {
        description: 'a'.repeat(2001),
      };

      const result = panelImportSchema.safeParse(invalidPanel);
      expect(result.success).toBe(false);
    });

    it('IPS-015: should reject cameraAngle exceeding 100 characters', () => {
      const invalidPanel = {
        cameraAngle: 'a'.repeat(101),
      };

      const result = panelImportSchema.safeParse(invalidPanel);
      expect(result.success).toBe(false);
    });

    it('IPS-016: should reject more than 20 characters in panel', () => {
      const invalidPanel = {
        characters: Array(21).fill('char-id'),
      };

      const result = panelImportSchema.safeParse(invalidPanel);
      expect(result.success).toBe(false);
    });

    it('IPS-017: should reject notes exceeding 1000 characters', () => {
      const invalidPanel = {
        notes: 'a'.repeat(1001),
      };

      const result = panelImportSchema.safeParse(invalidPanel);
      expect(result.success).toBe(false);
    });

    it('IPS-018: should reject more than 20 dialogues per panel', () => {
      const invalidPanel = {
        dialogues: Array(21).fill({
          characterName: 'John',
          type: 'speech',
          text: 'Hello!',
        }),
      };

      const result = panelImportSchema.safeParse(invalidPanel);
      expect(result.success).toBe(false);
    });

    it('IPS-019: should reject panel with invalid dialogue', () => {
      const invalidPanel = {
        dialogues: [
          {
            characterName: 'John',
            type: 'invalid-type',
            text: 'Hello!',
          },
        ],
      };

      const result = panelImportSchema.safeParse(invalidPanel);
      expect(result.success).toBe(false);
    });
  });

  describe('pageImportSchema - Page Fields', () => {
    it('IPS-020: should accept valid page with all fields', () => {
      const validPage = {
        title: 'Chapter 1: The Beginning',
        goal: 'Introduce the protagonist',
        setting: 'A medieval village',
        timeOfDay: 'morning',
        mood: 'hopeful',
        notes: 'Key establishing scene',
        panels: [
          {
            description: 'Wide shot of village',
            dialogues: [
              {
                characterName: 'Narrator',
                type: 'narration',
                text: 'In a land far away...',
              },
            ],
          },
        ],
      };

      const result = pageImportSchema.safeParse(validPage);
      expect(result.success).toBe(true);
    });

    it('IPS-021: should accept page with only required fields', () => {
      const minimalPage = {
        title: 'Page 1',
      };

      const result = pageImportSchema.safeParse(minimalPage);
      expect(result.success).toBe(true);
    });

    it('IPS-022: should reject page without title', () => {
      const invalidPage = {
        goal: 'Some goal',
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-023: should reject empty title', () => {
      const invalidPage = {
        title: '',
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-024: should reject title exceeding 200 characters', () => {
      const invalidPage = {
        title: 'a'.repeat(201),
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-025: should reject goal exceeding 1000 characters', () => {
      const invalidPage = {
        title: 'Test',
        goal: 'a'.repeat(1001),
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-026: should reject setting exceeding 500 characters', () => {
      const invalidPage = {
        title: 'Test',
        setting: 'a'.repeat(501),
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-027: should reject timeOfDay exceeding 100 characters', () => {
      const invalidPage = {
        title: 'Test',
        timeOfDay: 'a'.repeat(101),
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-028: should reject mood exceeding 100 characters', () => {
      const invalidPage = {
        title: 'Test',
        mood: 'a'.repeat(101),
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-029: should reject notes exceeding 2000 characters', () => {
      const invalidPage = {
        title: 'Test',
        notes: 'a'.repeat(2001),
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-030: should reject more than 50 panels per page', () => {
      const invalidPage = {
        title: 'Test',
        panels: Array(51).fill({}),
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });

    it('IPS-031: should reject page with invalid panel', () => {
      const invalidPage = {
        title: 'Test',
        panels: [
          {
            dialogues: [
              {
                characterName: '',
                type: 'speech',
                text: 'Missing name',
              },
            ],
          },
        ],
      };

      const result = pageImportSchema.safeParse(invalidPage);
      expect(result.success).toBe(false);
    });
  });

  describe('validatePageImport - Validation Function', () => {
    it('IPS-032: should return success=true with data for valid input', () => {
      const validPage = {
        title: 'Test Page',
        goal: 'Test goal',
      };

      const result = validatePageImport(validPage);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Page');
        expect(result.data.goal).toBe('Test goal');
      }
    });

    it('IPS-033: should return success=false with errors for invalid input', () => {
      const invalidPage = { goal: 'Missing title' };

      const result = validatePageImport(invalidPage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('title');
      }
    });

    it('IPS-034: should return formatted error paths for nested errors', () => {
      const invalidPage = {
        title: 'Test',
        panels: [
          {
            dialogues: [
              {
                characterName: 'John',
                type: 'invalid-type',
                text: 'Hello!',
              },
            ],
          },
        ],
      };

      const result = validatePageImport(invalidPage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('panels.0.dialogues.0.type'))).toBe(true);
      }
    });

    it('IPS-035: should handle non-object input gracefully', () => {
      const invalidInputs = [null, undefined, 'string', 123, [], true];

      for (const input of invalidInputs) {
        const result = validatePageImport(input);
        expect(result.success).toBe(false);
      }
    });

    it('IPS-036: should validate complex nested structure', () => {
      const complexPage = {
        title: 'Epic Battle Scene',
        goal: 'Climactic confrontation',
        setting: 'Castle courtyard',
        timeOfDay: 'dusk',
        mood: 'tense',
        notes: 'Key scene - take extra care with pacing',
        panels: [
          {
            description: 'Establishing shot',
            cameraAngle: 'wide',
            characters: ['hero', 'villain'],
            dialogues: [
              {
                characterName: 'Villain',
                type: 'speech',
                text: 'At last, we meet!',
                direction: 'with menace',
              },
              {
                characterName: 'Hero',
                type: 'thought',
                text: 'I must end this.',
              },
            ],
          },
          {
            description: 'Close-up on hero',
            cameraAngle: 'close-up',
            characters: ['hero'],
            dialogues: [
              {
                characterName: 'Hero',
                type: 'speech',
                text: 'This ends now!',
              },
            ],
          },
        ],
      };

      const result = validatePageImport(complexPage);
      expect(result.success).toBe(true);
    });
  });
});
