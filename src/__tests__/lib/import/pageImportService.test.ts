/**
 * Page Import Service Tests
 *
 * Integration tests for page import service with database.
 * ID prefix: IPIS (Import Page Integration Service)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db/database';
import { scriptPageRepository, panelRepository, editionRepository } from '@/lib/db/repositories';
import {
  importPage,
  importPageFromString,
  validatePageJSON,
  getPageImportSummary,
} from '@/lib/import/services/pageImportService';

describe('Page Import Service', () => {
  let testProjectId: string;
  let testEditionId: string;

  beforeEach(async () => {
    // Create a test project
    testProjectId = crypto.randomUUID();
    await db.projects.add({
      id: testProjectId,
      name: 'Test Project',
      description: 'Test project for import tests',
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      tags: [],
      settings: {
        defaultView: 'grid',
        gridColumns: 3,
        canvasBackground: '#ffffff',
      },
    });

    // Create a test edition
    const edition = await editionRepository.create(testProjectId, 'Test Edition');
    testEditionId = edition.id;
  });

  afterEach(async () => {
    // Clean up all test data
    await db.panels.clear();
    await db.scriptPages.clear();
    await db.editions.clear();
    await db.projects.clear();
  });

  describe('importPage', () => {
    it('IPIS-001: should create page with minimal data', async () => {
      const jsonData = { title: 'Test Page' };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.page.title).toBe('Test Page');
        expect(result.data.page.editionId).toBe(testEditionId);
        expect(result.data.page.id).toBeDefined();
        expect(result.data.panels).toHaveLength(0);

        // Verify in database
        const dbPage = await scriptPageRepository.getById(result.data.page.id);
        expect(dbPage).toBeDefined();
        expect(dbPage?.title).toBe('Test Page');
      }
    });

    it('IPIS-002: should create page with all fields', async () => {
      const jsonData = {
        title: 'Full Page',
        goal: 'Test the full import',
        setting: 'A test environment',
        timeOfDay: 'afternoon',
        mood: 'productive',
        notes: 'This is a comprehensive test',
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.page.title).toBe('Full Page');
        expect(result.data.page.goal).toBe('Test the full import');
        expect(result.data.page.setting).toBe('A test environment');
        expect(result.data.page.timeOfDay).toBe('afternoon');
        expect(result.data.page.mood).toBe('productive');
        expect(result.data.page.notes).toBe('This is a comprehensive test');
      }
    });

    it('IPIS-003: should create page with single panel', async () => {
      const jsonData = {
        title: 'Page with Panel',
        panels: [
          {
            description: 'Opening shot',
            cameraAngle: 'wide',
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels).toHaveLength(1);
        expect(result.data.panels[0].description).toBe('Opening shot');
        expect(result.data.panels[0].cameraAngle).toBe('wide');

        // Verify panel in database
        const dbPanel = await panelRepository.getById(result.data.panels[0].id);
        expect(dbPanel).toBeDefined();
        expect(dbPanel?.pageId).toBe(result.data.page.id);
      }
    });

    it('IPIS-004: should create page with multiple panels', async () => {
      const jsonData = {
        title: 'Multi-Panel Page',
        panels: [
          { description: 'Panel 1' },
          { description: 'Panel 2' },
          { description: 'Panel 3' },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels).toHaveLength(3);
        expect(result.data.panels[0].description).toBe('Panel 1');
        expect(result.data.panels[1].description).toBe('Panel 2');
        expect(result.data.panels[2].description).toBe('Panel 3');
      }
    });

    it('IPIS-005: should create panel with dialogues', async () => {
      const jsonData = {
        title: 'Page with Dialogues',
        panels: [
          {
            description: 'Conversation scene',
            dialogues: [
              {
                characterName: 'Alice',
                type: 'speech',
                text: 'Hello, Bob!',
              },
              {
                characterName: 'Bob',
                type: 'speech',
                text: 'Hello, Alice!',
              },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const panel = result.data.panels[0];
        expect(panel.dialogues).toBeDefined();
        expect(panel.dialogues).toHaveLength(2);
        expect(panel.dialogues![0].characterName).toBe('Alice');
        expect(panel.dialogues![0].text).toBe('Hello, Bob!');
        expect(panel.dialogues![1].characterName).toBe('Bob');
        expect(panel.dialogues![1].text).toBe('Hello, Alice!');
      }
    });

    it('IPIS-006: should handle all dialogue types', async () => {
      const jsonData = {
        title: 'All Dialogue Types',
        panels: [
          {
            description: 'Various dialogue types',
            dialogues: [
              { characterName: 'A', type: 'speech', text: 'Speech' },
              { characterName: 'A', type: 'thought', text: 'Thought' },
              { characterName: 'A', type: 'caption', text: 'Caption' },
              { characterName: 'A', type: 'sfx', text: 'BOOM!' },
              { characterName: 'A', type: 'narration', text: 'Narration' },
              { characterName: 'A', type: 'whisper', text: 'Whisper' },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const dialogues = result.data.panels[0].dialogues!;
        expect(dialogues).toHaveLength(6);
        expect(dialogues.map((d) => d.type)).toEqual([
          'speech',
          'thought',
          'caption',
          'sfx',
          'narration',
          'whisper',
        ]);
      }
    });

    it('IPIS-007: should return validation errors for invalid data', async () => {
      const jsonData = { goal: 'Missing title field' };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(false);
      if (!result.success && result.errors) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some((e) => e.toLowerCase().includes('title'))).toBe(true);
      }
    });

    it('IPIS-008: should return error for invalid dialogue type', async () => {
      const jsonData = {
        title: 'Invalid Dialogue',
        panels: [
          {
            dialogues: [
              {
                characterName: 'Test',
                type: 'invalid-type',
                text: 'Test',
              },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(false);
      if (!result.success && result.errors) {
        expect(result.errors.some((e) => e.toLowerCase().includes('type'))).toBe(true);
      }
    });

    it('IPIS-009: should preserve dialogue order', async () => {
      const jsonData = {
        title: 'Ordered Dialogues',
        panels: [
          {
            dialogues: [
              { characterName: 'A', type: 'speech', text: 'First' },
              { characterName: 'B', type: 'speech', text: 'Second' },
              { characterName: 'A', type: 'speech', text: 'Third' },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const texts = result.data.panels[0].dialogues!.map((d) => d.text);
        expect(texts).toEqual(['First', 'Second', 'Third']);
      }
    });

    it('IPIS-010: should preserve panel order', async () => {
      const jsonData = {
        title: 'Ordered Panels',
        panels: [
          { description: 'First panel' },
          { description: 'Second panel' },
          { description: 'Third panel' },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const descriptions = result.data.panels.map((p) => p.description);
        expect(descriptions).toEqual(['First panel', 'Second panel', 'Third panel']);
      }
    });
  });

  describe('importPageFromString', () => {
    it('IPIS-011: should parse and import valid JSON string', async () => {
      const jsonString = JSON.stringify({ title: 'String Page' });

      const result = await importPageFromString(testEditionId, jsonString);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.page.title).toBe('String Page');
      }
    });

    it('IPIS-012: should return error for invalid JSON syntax', async () => {
      const invalidJsonString = '{ title: "Missing quotes" }';

      const result = await importPageFromString(testEditionId, invalidJsonString);

      expect(result.success).toBe(false);
      if (!result.success && result.errors) {
        expect(result.errors.some((e) => e.toLowerCase().includes('json'))).toBe(true);
      }
    });

    it('IPIS-013: should handle complex nested JSON string', async () => {
      const complexPage = {
        title: 'Complex Page',
        panels: [
          {
            description: 'Complex panel',
            dialogues: [
              {
                characterName: 'Hero',
                type: 'speech',
                text: 'Complex dialogue with "quotes" and <brackets>',
                direction: 'dramatically',
              },
            ],
          },
        ],
      };
      const jsonString = JSON.stringify(complexPage);

      const result = await importPageFromString(testEditionId, jsonString);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels[0].dialogues![0].text).toBe(
          'Complex dialogue with "quotes" and <brackets>'
        );
      }
    });
  });

  describe('validatePageJSON', () => {
    it('IPIS-014: should validate JSON without creating page', async () => {
      const jsonData = { title: 'Validation Test' };

      const result = validatePageJSON(jsonData);

      expect(result.valid).toBe(true);

      // Verify no page was created
      const allPages = await db.scriptPages.toArray();
      expect(allPages).toHaveLength(0);
    });

    it('IPIS-015: should return validation errors without side effects', async () => {
      const invalidData = { goal: 'No title' };

      const result = validatePageJSON(invalidData);

      expect(result.valid).toBe(false);

      // Verify nothing was created
      const allPages = await db.scriptPages.toArray();
      expect(allPages).toHaveLength(0);
    });
  });

  describe('getPageImportSummary', () => {
    it('IPIS-016: should return summary for simple page', () => {
      const pageData = {
        title: 'Simple Page',
      };

      const summary = getPageImportSummary(pageData);

      expect(summary.hasTitle).toBe(true);
      expect(summary.panelCount).toBe(0);
      expect(summary.dialogueCount).toBe(0);
    });

    it('IPIS-017: should count panels correctly', () => {
      const pageData = {
        title: 'Multi-Panel',
        panels: [
          { description: 'Panel 1' },
          { description: 'Panel 2' },
          { description: 'Panel 3' },
        ],
      };

      const summary = getPageImportSummary(pageData);

      expect(summary.panelCount).toBe(3);
    });

    it('IPIS-018: should count all dialogues across panels', () => {
      const pageData = {
        title: 'With Dialogues',
        panels: [
          {
            dialogues: [
              { characterName: 'A', type: 'speech' as const, text: '1' },
              { characterName: 'B', type: 'speech' as const, text: '2' },
            ],
          },
          {
            dialogues: [
              { characterName: 'A', type: 'speech' as const, text: '3' },
            ],
          },
        ],
      };

      const summary = getPageImportSummary(pageData);

      expect(summary.dialogueCount).toBe(3);
    });

    it('IPIS-019: should detect presence of title', () => {
      const pageData = {
        title: 'Full Page',
        goal: 'Some goal',
        setting: 'Some setting',
        timeOfDay: 'morning',
        mood: 'happy',
        notes: 'Some notes',
      };

      const summary = getPageImportSummary(pageData);

      expect(summary.hasTitle).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('IPIS-020: should handle empty panels array', async () => {
      const jsonData = {
        title: 'No Panels',
        panels: [],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels).toHaveLength(0);
      }
    });

    it('IPIS-021: should handle panel with empty dialogues array', async () => {
      const jsonData = {
        title: 'Empty Dialogues',
        panels: [
          {
            description: 'Silent panel',
            dialogues: [],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels[0].dialogues).toHaveLength(0);
      }
    });

    it('IPIS-022: should handle unicode characters', async () => {
      const jsonData = {
        title: '日本語のページ',
        panels: [
          {
            description: 'Emoji panel 🎬',
            dialogues: [
              {
                characterName: '主人公',
                type: 'speech',
                text: 'こんにちは！🎉',
              },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.page.title).toBe('日本語のページ');
        expect(result.data.panels[0].dialogues![0].characterName).toBe('主人公');
      }
    });

    it('IPIS-023: should handle dialogue with direction', async () => {
      const jsonData = {
        title: 'Directed Dialogue',
        panels: [
          {
            dialogues: [
              {
                characterName: 'Actor',
                type: 'speech',
                text: 'Hello.',
                direction: 'softly, with a hint of sadness',
              },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels[0].dialogues![0].direction).toBe(
          'softly, with a hint of sadness'
        );
      }
    });

    it('IPIS-024: should handle dialogue with characterId reference', async () => {
      const jsonData = {
        title: 'Referenced Character',
        panels: [
          {
            dialogues: [
              {
                characterName: 'Hero',
                characterId: 'char-uuid-123',
                type: 'speech',
                text: 'I am referenced!',
              },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels[0].dialogues![0].characterId).toBe('char-uuid-123');
      }
    });

    it('IPIS-025: should handle panel with characters array', async () => {
      const jsonData = {
        title: 'Panel Characters',
        panels: [
          {
            description: 'Group scene',
            characters: ['char-1', 'char-2', 'char-3'],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.panels[0].characters).toEqual(['char-1', 'char-2', 'char-3']);
      }
    });

    it('IPIS-026: should handle special characters in text', async () => {
      const jsonData = {
        title: 'Special Characters',
        panels: [
          {
            dialogues: [
              {
                characterName: 'Narrator',
                type: 'narration',
                text: 'Line 1\nLine 2\n\tIndented\n"Quoted text"',
              },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const text = result.data.panels[0].dialogues![0].text;
        expect(text).toContain('\n');
        expect(text).toContain('\t');
        expect(text).toContain('"');
      }
    });
  });

  describe('Complex Scenarios', () => {
    it('IPIS-027: should handle realistic comic page structure', async () => {
      const jsonData = {
        title: 'Chapter 1, Page 5',
        goal: 'Establish conflict between hero and villain',
        setting: 'Rooftop at night',
        timeOfDay: 'midnight',
        mood: 'tense',
        notes: 'Key turning point - pacing is crucial',
        panels: [
          {
            description: 'Wide establishing shot of city skyline with two silhouettes on rooftop',
            cameraAngle: 'extreme wide',
            characters: ['hero', 'villain'],
            dialogues: [
              {
                characterName: 'Narrator',
                type: 'caption',
                text: 'The city sleeps, unaware of the battle about to unfold.',
              },
            ],
          },
          {
            description: 'Medium shot of hero facing villain',
            cameraAngle: 'medium',
            characters: ['hero', 'villain'],
            dialogues: [
              {
                characterName: 'Villain',
                type: 'speech',
                text: 'You cannot stop what is coming.',
                direction: 'menacingly',
              },
              {
                characterName: 'Hero',
                type: 'thought',
                text: 'I have to end this tonight.',
              },
            ],
          },
          {
            description: 'Close-up on hero\'s determined face',
            cameraAngle: 'close-up',
            characters: ['hero'],
            dialogues: [
              {
                characterName: 'Hero',
                type: 'speech',
                text: 'Watch me.',
              },
            ],
          },
          {
            description: 'Action shot - hero lunges forward',
            cameraAngle: 'dynamic',
            characters: ['hero', 'villain'],
            notes: 'Motion lines, dramatic angle',
            dialogues: [
              {
                characterName: 'SFX',
                type: 'sfx',
                text: 'WHOOSH!',
              },
            ],
          },
        ],
      };

      const result = await importPage(testEditionId, jsonData);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.page.title).toBe('Chapter 1, Page 5');
        expect(result.data.panels).toHaveLength(4);

        const summary = getPageImportSummary(jsonData as any);
        expect(summary.panelCount).toBe(4);
        expect(summary.dialogueCount).toBe(5);
        expect(summary.hasTitle).toBe(true);
      }
    });
  });
});
