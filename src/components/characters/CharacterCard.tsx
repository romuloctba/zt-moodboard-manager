'use client';

import { useState } from 'react';
import type { Character } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, User } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { toast } from 'sonner';
import { RenameDialog } from '@/components/projects/RenameDialog';

interface CharacterCardProps {
  character: Character;
  onClick: () => void;
}

export function CharacterCard({ character, onClick }: CharacterCardProps) {
  const [showRename, setShowRename] = useState(false);
  const { deleteCharacter, renameCharacter } = useProjectStore();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this character? This cannot be undone.')) {
      await deleteCharacter(character.id);
      toast.success('Character deleted');
    }
  };

  const handleRename = async (newName: string) => {
    await renameCharacter(character.id, newName);
    toast.success('Character renamed');
    setShowRename(false);
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(character.createdAt));

  return (
    <>
      <Card
        className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">{character.name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowRename(true); }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {character.description && (
            <CardDescription className="mb-3 line-clamp-2">
              {character.description}
            </CardDescription>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Created {formattedDate}</span>
            {character.tags.length > 0 && (
              <>
                <span>•</span>
                <span>{character.tags.length} tags</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <RenameDialog
        open={showRename}
        onOpenChange={setShowRename}
        title="Rename Character"
        currentName={character.name}
        onRename={handleRename}
      />
    </>
  );
}
