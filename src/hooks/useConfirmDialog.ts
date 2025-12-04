'use client';

import { useState, useCallback } from 'react';

interface UseConfirmDialogOptions {
  /** Default title for the dialog */
  defaultTitle?: string;
  /** Default description for the dialog */
  defaultDescription?: string;
}

interface ConfirmDialogState {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
  confirmLabel?: string;
  action: (() => void | Promise<void>) | null;
}

/**
 * Hook for managing confirmation dialog state
 */
export function useConfirmDialog(options: UseConfirmDialogOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<ConfirmDialogState>({
    title: options.defaultTitle || '',
    description: options.defaultDescription || '',
    variant: 'default',
    confirmLabel: undefined,
    action: null,
  });

  /**
   * Opens the confirmation dialog
   */
  const confirm = useCallback((config: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
    confirmLabel?: string;
    action: () => void | Promise<void>;
  }) => {
    setState({
      title: config.title || options.defaultTitle || '',
      description: config.description || options.defaultDescription || '',
      variant: config.variant || 'default',
      confirmLabel: config.confirmLabel,
      action: config.action,
    });
    setIsOpen(true);
  }, [options.defaultTitle, options.defaultDescription]);

  /**
   * Executes the stored action and closes the dialog
   */
  const execute = useCallback(async () => {
    if (!state.action) return;

    const action = state.action;
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
      setState(prev => ({ ...prev, action: null }));
    }
  }, [state]);

  /**
   * Closes the dialog without executing the action
   */
  const cancel = useCallback(() => {
    setIsOpen(false);
    setState(prev => ({ ...prev, action: null }));
  }, []);

  return {
    isOpen,
    isLoading,
    title: state.title,
    description: state.description,
    variant: state.variant,
    confirmLabel: state.confirmLabel,
    // Actions
    confirm,
    execute,
    cancel,
    setIsOpen,
  };
}

export type UseConfirmDialogReturn = ReturnType<typeof useConfirmDialog>;
