/**
 * Vitest Test Setup
 *
 * This file configures the test environment before each test run.
 * It sets up fake-indexeddb to simulate IndexedDB in Node.js environment.
 */

import 'fake-indexeddb/auto'
import { afterEach, vi } from 'vitest'
import { db } from '@/lib/db/database'

// Clean up after each test
afterEach(async () => {
  // Clear all tables instead of deleting the database
  // This keeps the connection open but provides test isolation
  await db.projects.clear()
  await db.characters.clear()
  await db.sections.clear()
  await db.canvasItems.clear()
  await db.images.clear()
  await db.tags.clear()
  await db.settings.clear()
  await db.editions.clear()
  await db.scriptPages.clear()
  await db.panels.clear()

  // Clear all mocks
  vi.clearAllMocks()
})

// Mock crypto.randomUUID for consistent test IDs when needed
// Tests can override this with vi.spyOn if they need specific IDs
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => {
        // Generate a proper UUID v4 format
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      },
    },
  })
}

// Suppress console warnings in tests (optional - comment out for debugging)
// vi.spyOn(console, 'warn').mockImplementation(() => {})
