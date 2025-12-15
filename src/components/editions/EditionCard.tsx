'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { Edition, EditionStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Copy, Trash2, BookOpen, FileText } from 'lucide-react';
import { useEditionStore } from '@/store/editionStore';
import { toast } from 'sonner';
import { EDITION_STATUS_COLORS } from '@/types';
import { cn } from '@/lib/utils';

interface EditionCardProps {
  edition: Edition;
  pageCount?: number;
  panelCount?: number;
  onClick: () => void;
}

export function EditionCard({ 
  edition, 
  pageCount = 0,
  panelCount = 0,
  onClick 
}: EditionCardProps) {
  const t = useTranslations('editions');
  const locale = useLocale();
  const { deleteEdition, duplicateEdition } = useEditionStore();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('confirmDelete'))) {
      await deleteEdition(edition.id);
      toast.success(t('toast.deleted'));
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicate = await duplicateEdition(edition.id, `${edition.title} (Copy)`);
    if (duplicate) {
      toast.success(t('toast.duplicated'));
    }
  };

  const formattedDate = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(edition.createdAt));

  const statusColor = EDITION_STATUS_COLORS[edition.status];

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg line-clamp-1">{edition.title}</CardTitle>
              {edition.issueNumber && (
                <p className="text-sm text-muted-foreground">
                  {t('card.issue', { number: edition.issueNumber })}
                  {edition.volume && ` • ${t('card.volume', { number: edition.volume })}`}
                </p>
              )}
            </div>
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
      <CardContent>
        {edition.synopsis && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {edition.synopsis}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {t('card.pages', { count: pageCount })}
            </span>
          </div>
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ 
              borderColor: statusColor,
              color: statusColor,
            }}
          >
            {t(`status.${edition.status}`)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
