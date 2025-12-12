/**
 * Retry Utilities
 * 
 * Provides exponential backoff retry logic for network operations.
 */

import { SyncException, type SyncErrorCode, SYNC_CONSTANTS } from '@/lib/sync/types';
import { debug } from './debug';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  nonRetryableErrors?: SyncErrorCode[];
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @param operation - The async function to retry
 * @param options - Retry configuration
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = SYNC_CONSTANTS.MAX_RETRIES,
    baseDelay = SYNC_CONSTANTS.RETRY_BASE_DELAY_MS,
    nonRetryableErrors = ['AUTH_FAILED', 'INVALID_DATA', 'STORAGE_FULL'],
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        debug.error(`[Retry] All ${maxRetries} retry attempts failed:`, error);
        throw error;
      }

      // Don't retry on non-retryable errors (like auth failures)
      if (error instanceof SyncException && nonRetryableErrors.includes(error.code)) {
        debug.warn(`[Retry] Non-retryable error (${error.code}), not retrying:`, error.message);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      debug.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms:`,
        error instanceof Error ? error.message : error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // TypeScript needs this, though we'll never reach here
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Check if an error is network-related and retryable
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Fetch network errors are TypeErrors
    return error.message.includes('fetch') || error.message.includes('network');
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')
    );
  }

  return false;
}
