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
import { useProjectStore } from '@/store/projectStore';
import { useControllableState } from '@/hooks';
import { validateCharacterJSON } from '@/lib/import';
import { toast } from 'sonner';

interface ImportCharacterDialogProps {
  /** Trigger element - optional when using controlled mode */
  children?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

// Example JSON for users to reference
const EXAMPLE_CHARACTER_JSON = {
  name: "Elena Starwind",
  description: "A skilled mage from the northern kingdoms",
  tags: ["mage", "protagonist", "fire-magic"],
  profile: {
    age: "28",
    role: "Deuteragonist",
    personality: ["intelligent", "cautious", "loyal"],
    abilities: ["Fire magic", "Ancient languages", "Healing"],
    backstory: "Raised in the Mage Academy, Elena discovered her true potential..."
  },
  metadata: {
    archetype: "The Mentor",
    inspirations: ["Gandalf", "Hermione"]
  }
};

export function ImportCharacterDialog({ children, open: controlledOpen, onOpenChange }: ImportCharacterDialogProps) {
  const t = useTranslations('import');
  const tActions = useTranslations('common.actions');
  const [open, setOpen] = useControllableState(controlledOpen, false, onOpenChange);

  const [jsonText, setJsonText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { importCharacterFromJSON, currentProject } = useProjectStore();

  const resetForm = useCallback(() => {
    setJsonText('');
    setErrors([]);
    setIsValid(null);
  }, []);

  // Validate JSON as user types (debounced effect would be nice but keeping it simple)
  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setErrors([]);
    setIsValid(null);

    if (!value.trim()) {
      return;
    }

    // Try to parse and validate
    try {
      const parsed = JSON.parse(value);
      const result = validateCharacterJSON(parsed);
      
      if (result.valid) {
        setIsValid(true);
        setErrors([]);
      } else {
        setIsValid(false);
        setErrors(result.errors ?? []);
      }
    } catch {
      setIsValid(false);
      setErrors([t('character.validation.invalidJson')]);
    }
  }, [t]);

  const handleCopyExample = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(EXAMPLE_CHARACTER_JSON, null, 2));
      toast.success(t('common.copyExample'));
    } catch {
      // Fallback: set the example in the textarea
      setJsonText(JSON.stringify(EXAMPLE_CHARACTER_JSON, null, 2));
    }
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentProject) {
      toast.error('No project selected');
      return;
    }

    if (!jsonText.trim()) {
      setErrors([t('character.validation.invalidJson')]);
      return;
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setErrors([t('character.validation.invalidJson')]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await importCharacterFromJSON(parsed);

      if (result.success) {
        toast.success(t('character.success'));
        setOpen(false);
        resetForm();
      } else {
        setErrors(result.errors ?? [t('character.error')]);
      }
    } catch (error) {
      console.error('Import error:', error);
      setErrors([t('character.error')]);
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
              {t('character.title')}
            </DialogTitle>
            <DialogDescription>
              {t('character.description')}
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
                  {t('character.example')}
                </Button>
              </div>
              <div className="relative flex-1 min-h-[200px]">
                <textarea
                  id="json-input"
                  className="flex h-full w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder={t('character.placeholder')}
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

            {/* Valid indicator */}
            {isValid && errors.length === 0 && (
              <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('character.validation.validJson')}
                </p>
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
              {isLoading ? tActions('creating') : t('character.import')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
