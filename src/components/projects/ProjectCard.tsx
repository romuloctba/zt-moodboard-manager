'use client';

import { useState } from 'react';
import type { Project } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Archive, Trash2, FolderOpen } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { toast } from 'sonner';
import { RenameDialog } from './RenameDialog';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [showRename, setShowRename] = useState(false);
  const { archiveProject, deleteProject, renameProject } = useProjectStore();

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await archiveProject(project.id);
    toast.success('Project archived');
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      await deleteProject(project.id);
      toast.success('Project deleted');
    }
  };

  const handleRename = async (newName: string) => {
    await renameProject(project.id, newName);
    toast.success('Project renamed');
    setShowRename(false);
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(project.createdAt));

  return (
    <>
      <Card
        className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{project.name}</CardTitle>
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
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
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
          {project.description && (
            <CardDescription className="mb-3 line-clamp-2">
              {project.description}
            </CardDescription>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Created {formattedDate}</span>
            {project.tags.length > 0 && (
              <>
                <span>•</span>
                <span>{project.tags.length} tags</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <RenameDialog
        open={showRename}
        onOpenChange={setShowRename}
        title="Rename Project"
        currentName={project.name}
        onRename={handleRename}
      />
    </>
  );
}
