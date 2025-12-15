/**
 * Hash Utilities for Sync
 * 
 * Provides content hashing for change detection during sync.
 * Uses SHA-256 for reliable content comparison.
 */

/**
 * Hash an object for change detection
 * Normalizes the object by sorting keys to ensure consistent hashing
 */
export async function hashObject(obj: unknown): Promise<string> {
  const normalized = normalizeForHashing(obj);
  const str = JSON.stringify(normalized);
  return hashString(str);
}

/**
 * Hash a file/blob for change detection
 */
export async function hashFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hashBuffer);
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize an object for consistent hashing
 * - Sorts object keys alphabetically
 * - Handles nested objects and arrays
 * - Excludes certain fields that shouldn't affect hash (like local paths)
 * - Skips undefined values to match JSON.stringify behavior
 */
function normalizeForHashing(obj: unknown): unknown {
  // null stays as null, undefined is skipped (handled at object level)
  if (obj === null) {
    return null;
  }

  if (obj === undefined) {
    // Return a special marker that we'll filter out at the object level
    return undefined;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(normalizeForHashing);
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      // Skip fields that are local-only and shouldn't affect sync hash
      if (isLocalOnlyField(key)) {
        continue;
      }

      const value = record[key];
      // Skip undefined values - JSON.stringify also skips them
      if (value === undefined) {
        continue;
      }

      const normalizedValue = normalizeForHashing(value);
      // Also skip if the normalized value is undefined
      if (normalizedValue !== undefined) {
        normalized[key] = normalizedValue;
      }
    }

    return normalized;
  }

  return obj;
}

/**
 * Fields that should not be included in hash calculation
 * These are local-specific and shouldn't trigger sync
 */
function isLocalOnlyField(key: string): boolean {
  const localOnlyFields = [
    'storagePath',      // Local file path
    'thumbnailPath',    // Local thumbnail path
    'syncedAt',         // Sync metadata
    '_localOnly',       // Explicit local-only marker
  ];

  return localOnlyFields.includes(key);
}

/**
 * Compare two hashes
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Generate a short hash for display purposes
 */
export function shortHash(hash: string, length = 8): string {
  return hash.substring(0, length);
}
