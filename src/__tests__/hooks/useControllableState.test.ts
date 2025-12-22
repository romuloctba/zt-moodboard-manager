import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useControllableState } from '@/hooks/useControllableState';

describe('useControllableState', () => {
  describe('Uncontrolled mode', () => {
    it('UC-001: should use default value when controlledValue is undefined', () => {
      const { result } = renderHook(() =>
        useControllableState(undefined, false)
      );

      expect(result.current[0]).toBe(false);
    });

    it('UC-002: should update internal state when setValue is called', () => {
      const { result } = renderHook(() =>
        useControllableState(undefined, false)
      );

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
    });

    it('UC-003: should not call onChange in uncontrolled mode', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControllableState(undefined, false, onChange)
      );

      act(() => {
        result.current[1](true);
      });

      expect(onChange).not.toHaveBeenCalled();
      expect(result.current[0]).toBe(true);
    });

    it('UC-004: should work with different default values', () => {
      const { result: boolResult } = renderHook(() =>
        useControllableState<boolean>(undefined, true)
      );
      expect(boolResult.current[0]).toBe(true);

      const { result: stringResult } = renderHook(() =>
        useControllableState<string>(undefined, 'default')
      );
      expect(stringResult.current[0]).toBe('default');

      const { result: numberResult } = renderHook(() =>
        useControllableState<number>(undefined, 42)
      );
      expect(numberResult.current[0]).toBe(42);
    });
  });

  describe('Controlled mode', () => {
    it('UC-005: should use controlledValue when provided', () => {
      const { result } = renderHook(() =>
        useControllableState(true, false)
      );

      expect(result.current[0]).toBe(true);
    });

    it('UC-006: should call onChange when setValue is called in controlled mode', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControllableState(false, false, onChange)
      );

      act(() => {
        result.current[1](true);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it('UC-007: should not update internal state in controlled mode', () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ controlled }) => useControllableState(controlled, false, onChange),
        { initialProps: { controlled: false as boolean | undefined } }
      );

      // Value should be controlled
      expect(result.current[0]).toBe(false);

      // Call setValue - it should call onChange but not change the value
      act(() => {
        result.current[1](true);
      });

      // Value is still false because we're controlled and didn't update prop
      expect(result.current[0]).toBe(false);
      expect(onChange).toHaveBeenCalledWith(true);

      // Now simulate parent updating the controlled value
      rerender({ controlled: true });
      expect(result.current[0]).toBe(true);
    });

    it('UC-008: should handle onChange being undefined in controlled mode gracefully', () => {
      const { result } = renderHook(() =>
        useControllableState(false, false, undefined)
      );

      // Should not throw when calling setValue without onChange
      expect(() => {
        act(() => {
          result.current[1](true);
        });
      }).not.toThrow();
    });
  });

  describe('Mode switching', () => {
    it('UC-009: should switch from uncontrolled to controlled mode', () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ controlled, onChange }) => useControllableState(controlled, false, onChange),
        { initialProps: { controlled: undefined as boolean | undefined, onChange } }
      );

      // Start uncontrolled
      expect(result.current[0]).toBe(false);

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
      expect(onChange).not.toHaveBeenCalled();

      // Switch to controlled
      rerender({ controlled: false, onChange });
      expect(result.current[0]).toBe(false); // Now uses controlled value

      act(() => {
        result.current[1](true);
      });

      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Edge cases', () => {
    it('UC-010: should handle null as a valid controlled value', () => {
      const { result } = renderHook(() =>
        useControllableState<string | null>(null, 'default')
      );

      expect(result.current[0]).toBe(null);
    });

    it('UC-011: should handle empty string as a valid controlled value', () => {
      const { result } = renderHook(() =>
        useControllableState('', 'default')
      );

      expect(result.current[0]).toBe('');
    });

    it('UC-012: should handle 0 as a valid controlled value', () => {
      const { result } = renderHook(() =>
        useControllableState(0, 100)
      );

      expect(result.current[0]).toBe(0);
    });

    it('UC-013: should handle false as a valid controlled value', () => {
      const { result } = renderHook(() =>
        useControllableState(false, true)
      );

      expect(result.current[0]).toBe(false);
    });
  });
});
