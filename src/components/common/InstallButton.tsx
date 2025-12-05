'use client';

import { ComponentProps } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallButtonProps extends Omit<ComponentProps<typeof Button>, 'onClick'> {
  /** Text to show in the button (optional, shows icon only if not provided) */
  label?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Show even when already installed (with disabled state) */
  showWhenInstalled?: boolean;
}

/**
 * Standalone PWA install button
 * Can be placed anywhere in the app (header, footer, etc.)
 * Only renders when installation is available
 */
export function InstallButton({
  label,
  tooltip = 'Install App',
  showWhenInstalled = false,
  variant = 'outline',
  size = 'icon',
  className,
  ...props
}: InstallButtonProps) {
  const { canInstall, isInstalled, isPrompting, promptInstall } = usePWAInstall();

  // Don't render if not installable and not showing when installed
  if (!canInstall && !isInstalled) {
    return null;
  }

  // Don't render if installed and not supposed to show
  if (isInstalled && !showWhenInstalled) {
    return null;
  }

  const button = (
    <Button
      variant={variant}
      size={label ? 'default' : size}
      onClick={promptInstall}
      disabled={isPrompting || isInstalled}
      className={className}
      {...props}
    >
      <Download className={label ? 'h-4 w-4 mr-2' : 'h-4 w-4'} />
      {label}
    </Button>
  );

  if (tooltip && !label) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{isInstalled ? 'Already installed' : tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
