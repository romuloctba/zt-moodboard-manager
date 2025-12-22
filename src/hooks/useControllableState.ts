'use client';

import { useState, useCallback } from 'react';

/**
 * A hook that allows a component to be either controlled or uncontrolled.
 * 
 * When `controlledValue` is provided (not undefined), the component is controlled
 * and will use `onChange` to communicate state changes to the parent.
 * 
 * When `controlledValue` is undefined, the component is uncontrolled and
 * manages its own internal state.
 * 
 * @param controlledValue - The controlled value from props (undefined for uncontrolled)
 * @param defaultValue - The default value for uncontrolled mode
 * @param onChange - Callback for when the value changes (required for controlled mode)
 * @returns A tuple of [currentValue, setValue]
 * 
 * @example
 * ```tsx
 * interface DialogProps {
 *   open?: boolean;
 *   onOpenChange?: (open: boolean) => void;
 * }
 * 
 * function Dialog({ open: controlledOpen, onOpenChange }: DialogProps) {
 *   const [open, setOpen] = useControllableState(controlledOpen, false, onOpenChange);
 *   // ...
 * }
 * ```
 */
export function useControllableState<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
): [T, (value: T) => void] {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback((newValue: T) => {
    if (isControlled) {
      onChange?.(newValue);
    } else {
      setInternalValue(newValue);
    }
  }, [isControlled, onChange]);

  return [value, setValue];
}
