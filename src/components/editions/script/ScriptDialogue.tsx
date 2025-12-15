'use client';

import type { PanelDialogue } from '@/types';
import { cn } from '@/lib/utils';

interface ScriptDialogueProps {
  dialogue: PanelDialogue;
}

/**
 * Renders a single dialogue entry in script format
 * Follows industry-standard comic script formatting
 */
export function ScriptDialogue({ dialogue }: ScriptDialogueProps) {
  const isSpecialType = ['caption', 'narration', 'sfx'].includes(dialogue.type);
  
  // Format the character/type header
  const getHeader = () => {
    switch (dialogue.type) {
      case 'caption':
        return 'CAPTION';
      case 'narration':
        return 'NARRATION';
      case 'sfx':
        return 'SFX';
      case 'thought':
        return `${dialogue.characterName.toUpperCase()} (THOUGHT)`;
      case 'whisper':
        return `${dialogue.characterName.toUpperCase()} (WHISPER)`;
      default:
        return dialogue.characterName.toUpperCase();
    }
  };

  // Add direction if present
  const header = dialogue.direction && !isSpecialType
    ? `${getHeader()} (${dialogue.direction})`
    : getHeader();

  return (
    <div className={cn(
      "script-dialogue ml-8 mb-3",
      dialogue.type === 'sfx' && "font-bold"
    )}>
      <p className="font-bold text-sm uppercase tracking-wide">
        {header}:
      </p>
      <p className={cn(
        "ml-4 text-sm",
        dialogue.type === 'sfx' ? "uppercase tracking-widest" : "italic"
      )}>
        {dialogue.type === 'sfx' ? dialogue.text : `"${dialogue.text}"`}
      </p>
    </div>
  );
}
