/**
 * Debug Utility Tests
 *
 * Tests for environment-aware logging that only outputs in development mode.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Debug Utility', () => {
  // Store original console methods
  const originalConsoleLog = console.log
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error
  const originalConsoleInfo = console.info

  beforeEach(() => {
    // Spy on console methods
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
    console.info = vi.fn()

    // Clear module cache to allow re-importing with different NODE_ENV
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
    console.info = originalConsoleInfo
  })

  describe('Development mode (NODE_ENV=development)', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('DB-001: debug.log should call console.log in development mode', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.log('test message', { data: 123 })

      expect(console.log).toHaveBeenCalledWith('test message', { data: 123 })
    })

    it('DB-002: debug.warn should call console.warn in development mode', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.warn('warning message')

      expect(console.warn).toHaveBeenCalledWith('warning message')
    })

    it('DB-003: debug.info should call console.info in development mode', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.info('info message')

      expect(console.info).toHaveBeenCalledWith('info message')
    })

    it('DB-004: debug.error should call console.error in development mode', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.error('error message', new Error('test'))

      expect(console.error).toHaveBeenCalledWith('error message', expect.any(Error))
    })
  })

  describe('Production mode (NODE_ENV=production)', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('DB-005: debug.log should NOT call console.log in production mode', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.log('test message')

      expect(console.log).not.toHaveBeenCalled()
    })

    it('DB-006: debug.warn should NOT call console.warn in production mode', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.warn('warning message')

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('DB-007: debug.info should NOT call console.info in production mode', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.info('info message')

      expect(console.info).not.toHaveBeenCalled()
    })

    it('DB-008: debug.error should ALWAYS call console.error (even in production)', async () => {
      const { debug } = await import('@/lib/utils/debug')

      debug.error('critical error', { context: 'production' })

      expect(console.error).toHaveBeenCalledWith('critical error', { context: 'production' })
    })
  })
})
