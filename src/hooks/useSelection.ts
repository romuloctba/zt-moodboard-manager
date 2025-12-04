'use client';

import { useState, useCallback } from 'react';

/**
 * A generic hook for managing selection state
 * @template T - The type of item IDs (usually string)
 */
export function useSelection<T extends string | number = string>() {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  /** Toggle selection for a single item */
  const toggle = useCallback((id: T) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  /** Select all items from the provided list */
  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  /** Clear all selections */
  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /** Check if an item is selected */
  const isSelected = useCallback((id: T) => selectedIds.has(id), [selectedIds]);

  /** Enter selection mode and optionally select an item */
  const enterSelectionMode = useCallback((initialId?: T) => {
    setSelectionMode(true);
    if (initialId !== undefined) {
      setSelectedIds(new Set([initialId]));
    }
  }, []);

  /** Exit selection mode and clear selection */
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  /** Toggle selection mode */
  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }, [selectionMode, enterSelectionMode, exitSelectionMode]);

  return {
    selectedIds,
    selectedArray: Array.from(selectedIds),
    selectionMode,
    count: selectedIds.size,
    hasSelection: selectedIds.size > 0,
    // Actions
    toggle,
    selectAll,
    clear,
    isSelected,
    setSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
  };
}

export type UseSelectionReturn<T extends string | number = string> = ReturnType<typeof useSelection<T>>;
