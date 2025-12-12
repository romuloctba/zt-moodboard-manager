/**
 * Debug Utilities
 * 
 * Environment-aware logging that only outputs in development mode.
 * Always logs errors regardless of environment.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

export const debug = {
  /**
   * Log messages (only in development)
   */
  log: (...args: unknown[]) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: unknown[]) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logs, even in production)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args: unknown[]) => {
    if (IS_DEV) {
      console.info(...args);
    }
  },
};
