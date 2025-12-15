'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Panel, PanelDialogue, DialogueType, Character } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Copy, 
  Trash2, 
  Plus,
  GripVertical,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useEditionStore } from '@/store/editionStore';
import { toast } from 'sonner';
import { DIALOGUE_TYPE_ICONS } from '@/types';
import { cn } from '@/lib/utils';

interface PanelEditorProps {
  panel: Panel;
  characters?: Character[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function PanelEditor({ 
  panel, 
  characters = [],
  isExpanded = true,
  onToggleExpand,
}: PanelEditorProps) {
  const t = useTranslations('editions.panels');
  const tDialogue = useTranslations('editions.dialogue');
  const { updatePanel, deletePanel, duplicatePanel, addDialogue, updateDialogue, removeDialogue } = useEditionStore();

  const [description, setDescription] = useState(panel.description ?? '');
  const [cameraAngle, setCameraAngle] = useState(panel.cameraAngle ?? '');
  const [notes, setNotes] = useState(panel.notes ?? '');
  
  // New dialogue state
  const [showAddDialogue, setShowAddDialogue] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newDialogueType, setNewDialogueType] = useState<DialogueType>('speech');
  const [newDialogueText, setNewDialogueText] = useState('');
  const [newDirection, setNewDirection] = useState('');

  const handleDescriptionBlur = useCallback(async () => {
    if (description !== panel.description) {
      await updatePanel(panel.id, { description: description || undefined });
    }
  }, [description, panel.description, panel.id, updatePanel]);

  const handleCameraAngleBlur = useCallback(async () => {
    if (cameraAngle !== panel.cameraAngle) {
      await updatePanel(panel.id, { cameraAngle: cameraAngle || undefined });
    }
  }, [cameraAngle, panel.cameraAngle, panel.id, updatePanel]);

  const handleNotesBlur = useCallback(async () => {
    if (notes !== panel.notes) {
      await updatePanel(panel.id, { notes: notes || undefined });
    }
  }, [notes, panel.notes, panel.id, updatePanel]);

  const handleDelete = async () => {
    if (confirm(t('confirmDelete'))) {
      await deletePanel(panel.id);
      toast.success(t('toast.deleted'));
    }
  };

  const handleDuplicate = async () => {
    const duplicate = await duplicatePanel(panel.id);
    if (duplicate) {
      toast.success(t('toast.duplicated'));
    }
  };

  const handleAddDialogue = async () => {
    if (!newCharacterName.trim() || !newDialogueText.trim()) return;

    await addDialogue(panel.id, {
      characterName: newCharacterName.trim(),
      type: newDialogueType,
      text: newDialogueText.trim(),
      direction: newDirection.trim() || undefined,
    });

    // Reset form
    setNewCharacterName('');
    setNewDialogueType('speech');
    setNewDialogueText('');
    setNewDirection('');
    setShowAddDialogue(false);
    toast.success(tDialogue('toast.added'));
  };

  const handleDeleteDialogue = async (dialogueId: string) => {
    await removeDialogue(panel.id, dialogueId);
    toast.success(tDialogue('toast.deleted'));
  };

  const dialogueTypes: DialogueType[] = ['speech', 'thought', 'caption', 'sfx', 'narration', 'whisper'];

  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={onToggleExpand}
            >
              <span className="font-semibold text-sm">
                {t('card.panel', { number: panel.panelNumber })}
              </span>
              {!isExpanded && panel.description && (
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                  — {panel.description}
                </span>
              )}
              {onToggleExpand && (
                isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                {t('menu.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('menu.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Panel Description */}
          <div className="grid gap-2">
            <Label htmlFor={`desc-${panel.id}`} className="text-xs">
              {t('editor.descriptionLabel')}
            </Label>
            <textarea
              id={`desc-${panel.id}`}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder={t('editor.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
            />
          </div>

          {/* Camera Angle */}
          <div className="grid gap-2">
            <Label htmlFor={`camera-${panel.id}`} className="text-xs">
              {t('editor.cameraAngleLabel')}
            </Label>
            <Input
              id={`camera-${panel.id}`}
              placeholder={t('editor.cameraAnglePlaceholder')}
              value={cameraAngle}
              onChange={(e) => setCameraAngle(e.target.value)}
              onBlur={handleCameraAngleBlur}
            />
          </div>

          {/* Dialogues Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{tDialogue('header.title')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowAddDialogue(!showAddDialogue)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {tDialogue('header.addDialogue')}
              </Button>
            </div>

            {/* Existing Dialogues */}
            {panel.dialogues.length > 0 ? (
              <div className="space-y-2">
                {panel.dialogues
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((dialogue) => (
                    <DialogueItem
                      key={dialogue.id}
                      dialogue={dialogue}
                      panelId={panel.id}
                      onDelete={() => handleDeleteDialogue(dialogue.id)}
                    />
                  ))}
              </div>
            ) : !showAddDialogue && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {tDialogue('emptyState.hint')}
              </p>
            )}

            {/* Add Dialogue Form */}
            {showAddDialogue && (
              <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="new-char" className="text-xs">
                      {tDialogue('editor.characterLabel')}
                    </Label>
                    <Input
                      id="new-char"
                      placeholder={tDialogue('editor.characterPlaceholder')}
                      value={newCharacterName}
                      onChange={(e) => setNewCharacterName(e.target.value)}
                      list="character-list"
                    />
                    {characters.length > 0 && (
                      <datalist id="character-list">
                        {characters.map((c) => (
                          <option key={c.id} value={c.name} />
                        ))}
                      </datalist>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">{tDialogue('editor.typeLabel')}</Label>
                    <Select value={newDialogueType} onValueChange={(v) => setNewDialogueType(v as DialogueType)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogueTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            <span className="flex items-center gap-2">
                              <span>{DIALOGUE_TYPE_ICONS[type]}</span>
                              {tDialogue(`types.${type}`)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="new-text" className="text-xs">
                    {tDialogue('editor.textLabel')}
                  </Label>
                  <textarea
                    id="new-text"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    placeholder={tDialogue('editor.textPlaceholder')}
                    value={newDialogueText}
                    onChange={(e) => setNewDialogueText(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="new-direction" className="text-xs">
                    {tDialogue('editor.directionLabel')}
                  </Label>
                  <Input
                    id="new-direction"
                    placeholder={tDialogue('editor.directionPlaceholder')}
                    value={newDirection}
                    onChange={(e) => setNewDirection(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddDialogue(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddDialogue}
                    disabled={!newCharacterName.trim() || !newDialogueText.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Artist Notes */}
          <div className="grid gap-2">
            <Label htmlFor={`notes-${panel.id}`} className="text-xs">
              {t('editor.notesLabel')}
            </Label>
            <textarea
              id={`notes-${panel.id}`}
              className="flex min-h-[50px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder={t('editor.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Separate component for dialogue items
interface DialogueItemProps {
  dialogue: PanelDialogue;
  panelId: string;
  onDelete: () => void;
}

function DialogueItem({ dialogue, panelId, onDelete }: DialogueItemProps) {
  const tDialogue = useTranslations('editions.dialogue');
  const { updateDialogue } = useEditionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(dialogue.text);

  const handleSaveEdit = async () => {
    if (editText.trim() !== dialogue.text) {
      await updateDialogue(panelId, dialogue.id, { text: editText.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className={cn(
      "p-2 rounded border bg-background flex items-start gap-2",
      dialogue.type === 'thought' && "border-blue-500/30 bg-blue-500/5",
      dialogue.type === 'caption' && "border-yellow-500/30 bg-yellow-500/5",
      dialogue.type === 'sfx' && "border-red-500/30 bg-red-500/5",
      dialogue.type === 'narration' && "border-purple-500/30 bg-purple-500/5",
    )}>
      <span className="text-lg" title={tDialogue(`types.${dialogue.type}`)}>
        {DIALOGUE_TYPE_ICONS[dialogue.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">
          {dialogue.characterName}
          {dialogue.direction && (
            <span className="font-normal italic ml-1">({dialogue.direction})</span>
          )}
        </p>
        {isEditing ? (
          <div className="mt-1">
            <textarea
              className="w-full text-sm p-1 border rounded resize-none"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              rows={2}
            />
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-6 text-xs" onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p 
            className="text-sm mt-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
            onClick={() => setIsEditing(true)}
          >
            {dialogue.text}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}
