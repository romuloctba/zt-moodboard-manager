'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
  const t = useTranslations('projects');
  const locale = useLocale();
  const [showRename, setShowRename] = useState(false);
  const { archiveProject, deleteProject, renameProject } = useProjectStore();

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await archiveProject(project.id);
    toast.success(t('toast.archived'));
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('confirmDelete'))) {
      await deleteProject(project.id);
      toast.success(t('toast.deleted'));
    }
  };

  const handleRename = async (newName: string) => {
    await renameProject(project.id, newName);
    toast.success(t('toast.renamed'));
    setShowRename(false);
  };

  const formattedDate = new Intl.DateTimeFormat(locale, {
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
                  {t('menu.rename')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  {t('menu.archive')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('menu.delete')}
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
            <span>{t('card.created', { date: formattedDate })}</span>
            {project.tags.length > 0 && (
              <>
                <span>•</span>
                <span>{t('card.tags', { count: project.tags.length })}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <RenameDialog
        open={showRename}
        onOpenChange={setShowRename}
        title={t('renameDialog.title')}
        currentName={project.name}
        onRename={handleRename}
      />
    </>
  );
}
