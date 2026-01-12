'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileUp, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useEditionStore } from '@/store/editionStore';
import { useControllableState } from '@/hooks';
import { validatePageJSON, getPageImportSummary } from '@/lib/import';
import { toast } from 'sonner';

interface ImportPageDialogProps {
  /** Trigger element - optional when using controlled mode */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

// Example JSON for users to reference
const EXAMPLE_PAGE_JSON = {
  title: "The Confrontation",
  goal: "Hero faces the villain for the first time",
  setting: "Abandoned warehouse, night",
  timeOfDay: "Midnight",
  mood: "Tense, dramatic",
  panels: [
    {
      description: "Wide shot establishing the warehouse interior",
      cameraAngle: "High angle, wide shot",
      characters: ["Hero"],
      dialogues: [
        {
          characterName: "Narrator",
          type: "caption",
          text: "The moment he had been dreading had finally arrived."
        }
      ]
    },
    {
      description: "Close-up on Hero's face, determination in his eyes",
      cameraAngle: "Close-up",
      dialogues: [
        {
          characterName: "Hero",
          type: "speech",
          text: "I know you're here. Show yourself!",
          direction: "(shouting, fists clenched)"
        }
      ]
    }
  ]
};

export function ImportPageDialog({ children, open: controlledOpen, onOpenChange }: ImportPageDialogProps) {
  const t = useTranslations('import');
  const tActions = useTranslations('common.actions');
  const [open, setOpen] = useControllableState(controlledOpen, false, onOpenChange);

  const [jsonText, setJsonText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<{ panelCount: number; dialogueCount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { importPageFromJSON, currentEdition } = useEditionStore();

  const resetForm = useCallback(() => {
    setJsonText('');
    setErrors([]);
    setIsValid(null);
    setSummary(null);
  }, []);

  // Validate JSON as user types
  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setErrors([]);
    setIsValid(null);
    setSummary(null);

    if (!value.trim()) {
      return;
    }

    // Try to parse and validate
    try {
      const parsed = JSON.parse(value);
      const result = validatePageJSON(parsed);
      
      if (result.valid && result.data) {
        setIsValid(true);
        setErrors([]);
        // Calculate summary for preview
        const importSummary = getPageImportSummary(result.data);
        setSummary({
          panelCount: importSummary.panelCount,
          dialogueCount: importSummary.dialogueCount,
        });
      } else {
        setIsValid(false);
        setErrors(result.errors ?? []);
        setSummary(null);
      }
    } catch {
      setIsValid(false);
      setErrors([t('page.validation.invalidJson')]);
      setSummary(null);
    }
  }, [t]);

  const handleCopyExample = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(EXAMPLE_PAGE_JSON, null, 2));
      toast.success(t('common.copyExample'));
    } catch {
      // Fallback: set the example in the textarea
      setJsonText(JSON.stringify(EXAMPLE_PAGE_JSON, null, 2));
    }
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEdition) {
      toast.error('No edition selected');
      return;
    }

    if (!jsonText.trim()) {
      setErrors([t('page.validation.invalidJson')]);
      return;
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setErrors([t('page.validation.invalidJson')]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await importPageFromJSON(parsed);

      if (result.success) {
        toast.success(t('page.success'));
        setOpen(false);
        resetForm();
      } else {
        setErrors(result.errors ?? [t('page.error')]);
      }
    } catch (error) {
      console.error('Import error:', error);
      setErrors([t('page.error')]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      {children && (
        <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          {children}
        </DialogTrigger>
      )}
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              {t('page.title')}
            </DialogTitle>
            <DialogDescription>
              {t('page.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 grid gap-4 py-4 overflow-hidden">
            <div className="grid gap-2 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <Label htmlFor="json-input">JSON</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCopyExample}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {t('page.example')}
                </Button>
              </div>
              <div className="relative flex-1 min-h-[200px]">
                <textarea
                  id="json-input"
                  className="flex h-full w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder={t('page.placeholder')}
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  autoFocus
                  spellCheck={false}
                />
                {/* Validation indicator */}
                {isValid !== null && (
                  <div className="absolute top-2 right-2">
                    {isValid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Validation Errors */}
            {errors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 max-h-[120px] overflow-y-auto">
                <p className="text-sm font-medium text-destructive mb-1">
                  {t('common.errors')}
                </p>
                <ul className="text-sm text-destructive/90 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="font-mono text-xs">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Valid indicator with summary */}
            {isValid && errors.length === 0 && (
              <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('page.validation.validJson')}
                </p>
                {summary && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('page.summary.panels', { count: summary.panelCount })} • {t('page.summary.dialogues', { count: summary.dialogueCount })}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tActions('cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isValid}
            >
              {isLoading ? tActions('creating') : t('page.import')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
