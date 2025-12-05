'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * BeforeInstallPromptEvent interface
 * This event is fired when the browser detects that the site can be installed as a PWA
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend the Window interface
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export interface UsePWAInstallReturn {
  /** Whether the app can be installed (install prompt is available) */
  canInstall: boolean;
  /** Whether the app is already installed */
  isInstalled: boolean;
  /** Whether the installation prompt is currently showing */
  isPrompting: boolean;
  /** Trigger the installation prompt */
  promptInstall: () => Promise<boolean>;
  /** The platform(s) the app can be installed on */
  platforms: string[];
}

/**
 * Hook to manage PWA installation
 * 
 * Captures the `beforeinstallprompt` event and provides methods to:
 * - Check if the app can be installed
 * - Trigger the installation prompt
 * - Track installation status
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkInstalled = () => {
      // Check display-mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check iOS standalone
      const isIOSStandalone = ('standalone' in window.navigator) &&
        (window.navigator as Navigator & { standalone: boolean }).standalone;

      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    // Capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e);
      setCanInstall(true);
      setPlatforms(e.platforms || []);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Trigger the installation prompt
   * @returns true if the user accepted the installation, false otherwise
   */
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    setIsPrompting(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt]);

  return {
    canInstall,
    isInstalled,
    isPrompting,
    promptInstall,
    platforms,
  };
}
