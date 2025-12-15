'use client';

import { useTranslations } from 'next-intl';
import type { Panel } from '@/types';
import { ScriptDialogue } from './ScriptDialogue';

interface ScriptPanelProps {
  panel: Panel;
  showPanelNumber?: boolean;
}

/**
 * Renders a single panel in script format
 * Shows panel number, description, camera angle, dialogues, and notes
 */
export function ScriptPanel({ panel, showPanelNumber = true }: ScriptPanelProps) {
  const t = useTranslations('editions.export');

  return (
    <div className="script-panel mb-6 break-inside-avoid">
      {/* Panel Header */}
      {showPanelNumber && (
        <h4 className="font-bold text-base mb-2 uppercase tracking-wide">
          {t('panel', { number: panel.panelNumber })}
        </h4>
      )}

      {/* Panel Description (visual description) */}
      {panel.description && (
        <p className="text-sm mb-2 leading-relaxed">
          {panel.description}
        </p>
      )}

      {/* Camera Angle */}
      {panel.cameraAngle && (
        <p className="text-sm text-muted-foreground mb-3 italic">
          {t('camera')}: {panel.cameraAngle}
        </p>
      )}

      {/* Dialogues */}
      {panel.dialogues.length > 0 && (
        <div className="script-dialogues mt-3">
          {panel.dialogues
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((dialogue) => (
              <ScriptDialogue key={dialogue.id} dialogue={dialogue} />
            ))}
        </div>
      )}

      {/* Artist Notes */}
      {panel.notes && (
        <div className="mt-3 p-2 bg-muted/30 rounded text-xs border-l-2 border-muted-foreground/30 print:bg-gray-100">
          <span className="font-semibold uppercase text-muted-foreground">
            {t('artistNotes')}:
          </span>{' '}
          <span className="text-muted-foreground">{panel.notes}</span>
        </div>
      )}
    </div>
  );
}
