'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseNotFoundOptions {
  /** The entity being loaded (for error messages) */
  entity: string;
  /** Whether to redirect to a custom URL instead of the not-found page */
  redirectTo?: string;
  /** Delay before redirecting (in ms) */
  delay?: number;
}

/**
 * Hook to handle "not found" scenarios by redirecting to the not-found page
 * or a custom URL when data fails to load.
 */
export function useNotFound(options: UseNotFoundOptions) {
  const router = useRouter();
  const hasTriggered = useRef(false);
  const { entity, redirectTo, delay = 0 } = options;

  const triggerNotFound = useCallback(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    console.warn(`${entity} not found, redirecting...`);

    const redirect = () => {
      if (redirectTo) {
        router.replace(redirectTo);
      } else {
        // Navigate to the not-found page
        router.replace('/not-found');
      }
    };

    if (delay > 0) {
      setTimeout(redirect, delay);
    } else {
      redirect();
    }
  }, [entity, redirectTo, delay, router]);

  const reset = useCallback(() => {
    hasTriggered.current = false;
  }, []);

  return { triggerNotFound, reset };
}

/**
 * Hook that automatically triggers not-found when a condition is met.
 * Useful for declarative not-found handling.
 */
export function useNotFoundWhen(
  condition: boolean,
  options: UseNotFoundOptions
) {
  const { triggerNotFound } = useNotFound(options);

  useEffect(() => {
    if (condition) {
      triggerNotFound();
    }
  }, [condition, triggerNotFound]);
}
