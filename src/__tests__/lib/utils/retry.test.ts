/**
 * Retry Utility Tests
 *
 * Tests for retryWithBackoff and isNetworkError utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff, isNetworkError } from '@/lib/utils/retry'
import { SyncException } from '@/lib/sync/types'

// Mock the debug utility to suppress console output during tests
vi.mock('@/lib/utils/debug', () => ({
  debug: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('Retry Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('retryWithBackoff', () => {
    it('RT-001: should return result without retry on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const resultPromise = retryWithBackoff(operation)
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('RT-002: should retry and return result on eventual success', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const resultPromise = retryWithBackoff(operation)

      // First attempt fails, wait for first retry delay (1000ms)
      await vi.advanceTimersByTimeAsync(1000)
      // Second attempt fails, wait for second retry delay (2000ms)
      await vi.advanceTimersByTimeAsync(2000)

      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('RT-003: should throw after max attempts (default: 3)', async () => {
      const error = new Error('persistent failure')
      const operation = vi.fn().mockRejectedValue(error)

      const resultPromise = retryWithBackoff(operation)
      // Attach the rejection handler BEFORE advancing timers
      const expectation = expect(resultPromise).rejects.toThrow('persistent failure')

      // Advance through all retry delays (total: 1000 + 2000 + 4000 = 7000ms)
      await vi.advanceTimersByTimeAsync(7000)

      await expectation
      // Initial attempt + 3 retries = 4 calls
      expect(operation).toHaveBeenCalledTimes(4)
    })

    it('RT-004: should increase delay between retries with exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      const resultPromise = retryWithBackoff(operation, { baseDelay: 100 })

      // First retry after 100ms (100 * 2^0)
      await vi.advanceTimersByTimeAsync(100)
      // Second retry after 200ms (100 * 2^1)
      await vi.advanceTimersByTimeAsync(200)

      await resultPromise

      // Extract only the retry delays (setTimeout is called for each retry)
      const delays = setTimeoutSpy.mock.calls.map((call) => call[1])

      // Verify exponential backoff: delays should be 100, 200 (not linear like 100, 100)
      // Find the first two non-zero delays
      const retryDelays = delays.filter((d) => d && d > 0)
      expect(retryDelays.length).toBeGreaterThanOrEqual(2)

      // Verify exponential pattern: second delay should be double the first
      expect(retryDelays[0]).toBe(100) // First retry: 100 * 2^0 = 100
      expect(retryDelays[1]).toBe(200) // Second retry: 100 * 2^1 = 200

      // Verify it's exponential, not linear
      expect(retryDelays[1]).toBe(retryDelays[0]! * 2)
    })

    it('RT-005: should not retry AUTH_FAILED, INVALID_DATA, STORAGE_FULL errors', async () => {
      const authError = new SyncException('Auth failed', 'AUTH_FAILED')
      const operation = vi.fn().mockRejectedValue(authError)

      const resultPromise = retryWithBackoff(operation)

      await expect(resultPromise).rejects.toThrow('Auth failed')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('RT-005b: should not retry INVALID_DATA errors', async () => {
      const invalidDataError = new SyncException('Invalid data', 'INVALID_DATA')
      const operation = vi.fn().mockRejectedValue(invalidDataError)

      const resultPromise = retryWithBackoff(operation)

      await expect(resultPromise).rejects.toThrow('Invalid data')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('RT-005c: should not retry STORAGE_FULL errors', async () => {
      const storageFullError = new SyncException('Storage full', 'STORAGE_FULL')
      const operation = vi.fn().mockRejectedValue(storageFullError)

      const resultPromise = retryWithBackoff(operation)

      await expect(resultPromise).rejects.toThrow('Storage full')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('RT-005d: should retry NETWORK_ERROR (retryable error)', async () => {
      const networkError = new SyncException('Network error', 'NETWORK_ERROR')
      const operation = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success')

      const resultPromise = retryWithBackoff(operation)

      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(1000)

      const result = await resultPromise
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('RT-006: should respect custom maxRetries value', async () => {
      const error = new Error('failure')
      const operation = vi.fn().mockRejectedValue(error)

      const resultPromise = retryWithBackoff(operation, { maxRetries: 1 })
      // Attach the rejection handler BEFORE advancing timers
      const expectation = expect(resultPromise).rejects.toThrow('failure')

      // Only 1 retry allowed, advance past all delays
      await vi.advanceTimersByTimeAsync(2000)

      await expectation
      // Initial attempt + 1 retry = 2 calls
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('RT-007: should respect custom baseDelay for backoff calculation', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      const resultPromise = retryWithBackoff(operation, { baseDelay: 500 })

      // Custom base delay of 500ms
      await vi.advanceTimersByTimeAsync(500)

      await resultPromise

      // Verify setTimeout was called with custom baseDelay
      const delays = setTimeoutSpy.mock.calls.map((call) => call[1])
      expect(delays).toContain(500)
    })

    it('RT-008: should respect custom list of non-retryable error codes', async () => {
      // RATE_LIMITED is normally retryable, but we make it non-retryable
      const rateLimitedError = new SyncException('Rate limited', 'RATE_LIMITED')
      const operation = vi.fn().mockRejectedValue(rateLimitedError)

      const resultPromise = retryWithBackoff(operation, {
        nonRetryableErrors: ['RATE_LIMITED'],
      })

      await expect(resultPromise).rejects.toThrow('Rate limited')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('RT-008b: should retry previously non-retryable errors when customized', async () => {
      // AUTH_FAILED is normally non-retryable, but we can make it retryable
      const authError = new SyncException('Auth failed', 'AUTH_FAILED')
      const operation = vi
        .fn()
        .mockRejectedValueOnce(authError)
        .mockResolvedValue('success')

      const resultPromise = retryWithBackoff(operation, {
        nonRetryableErrors: [], // Empty list - all errors are retryable
      })

      await vi.advanceTimersByTimeAsync(1000)

      const result = await resultPromise
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('RT-NEW-001: maxRetries=0 should throw immediately on first failure', async () => {
      const error = new Error('immediate failure')
      const operation = vi.fn().mockRejectedValue(error)

      const resultPromise = retryWithBackoff(operation, { maxRetries: 0 })

      await expect(resultPromise).rejects.toThrow('immediate failure')
      // Only 1 call - no retries allowed
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('RT-NEW-002: regular Error (not SyncException) should be retried', async () => {
      // Regular Error is NOT in nonRetryableErrors list, so should be retried
      const regularError = new Error('transient error')
      const operation = vi
        .fn()
        .mockRejectedValueOnce(regularError)
        .mockResolvedValue('recovered')

      const resultPromise = retryWithBackoff(operation)

      await vi.advanceTimersByTimeAsync(1000)

      const result = await resultPromise
      expect(result).toBe('recovered')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('RT-NEW-003: should use default SYNC_CONSTANTS values when no options provided', async () => {
      // This tests that defaults from SYNC_CONSTANTS are used
      // Default maxRetries is 3, default baseDelay is 1000ms
      const error = new Error('failure')
      const operation = vi.fn().mockRejectedValue(error)

      const resultPromise = retryWithBackoff(operation)
      const expectation = expect(resultPromise).rejects.toThrow()

      // Default delays: 1000 + 2000 + 4000 = 7000ms total
      await vi.advanceTimersByTimeAsync(7000)

      await expectation
      // Default maxRetries=3 means 4 total attempts (initial + 3 retries)
      expect(operation).toHaveBeenCalledTimes(4)
    })
  })

  describe('isNetworkError', () => {
    it('RT-009: should detect TypeError containing "fetch" as network error', () => {
      const error = new TypeError('Failed to fetch')
      expect(isNetworkError(error)).toBe(true)
    })

    it('RT-010: should detect TypeError containing "network" as network error', () => {
      const error = new TypeError('network request failed')
      expect(isNetworkError(error)).toBe(true)
    })

    it('RT-011a: should detect Error containing "timeout" as network error', () => {
      const error = new Error('Request timeout')
      expect(isNetworkError(error)).toBe(true)
    })

    it('RT-011b: should detect Error containing "connection" as network error', () => {
      const error = new Error('Connection refused')
      expect(isNetworkError(error)).toBe(true)
    })

    it('RT-011c: should detect Error containing "fetch" as network error', () => {
      const error = new Error('fetch failed')
      expect(isNetworkError(error)).toBe(true)
    })

    it('RT-012a: should return false for unrelated errors', () => {
      const error = new Error('Something went wrong')
      expect(isNetworkError(error)).toBe(false)
    })

    it('RT-012b: should return false for non-Error values', () => {
      expect(isNetworkError('string error')).toBe(false)
      expect(isNetworkError(null)).toBe(false)
      expect(isNetworkError(undefined)).toBe(false)
      expect(isNetworkError(42)).toBe(false)
    })

    it('RT-012c: should return false for TypeError without network keywords', () => {
      const error = new TypeError('Cannot read property of undefined')
      expect(isNetworkError(error)).toBe(false)
    })
  })
})
