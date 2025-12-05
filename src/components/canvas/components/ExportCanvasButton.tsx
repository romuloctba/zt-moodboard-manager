'use client';

import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExportCanvasButtonProps {
  onExport: () => void;
  isExporting?: boolean;
  disabled?: boolean;
  label?: string;
}

/**
 * A reusable button component for exporting canvas as image
 * Follows dumb component pattern - receives all data via props
 */
export function ExportCanvasButton({
  onExport,
  isExporting = false,
  disabled = false,
  label = 'Export as image',
}: ExportCanvasButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onExport}
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
