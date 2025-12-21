'use client';

import { useTranslations } from 'next-intl';
import type { ScriptPage } from '@/types';
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
import { MoreHorizontal, Copy, Trash2, Layers } from 'lucide-react';
import { useEditionStore } from '@/store/editionStore';
import { toast } from 'sonner';
import { PAGE_STATUS_COLORS } from '@/types';

interface PageCardProps {
  page: ScriptPage;
  panelCount?: number;
  onClick: () => void;
}

export function PageCard({ page, panelCount = 0, onClick }: PageCardProps) {
  const t = useTranslations('editions.pages');
  const { deletePage, duplicatePage } = useEditionStore();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('confirmDelete'))) {
      await deletePage(page.id);
      toast.success(t('toast.deleted'));
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicate = await duplicatePage(page.id);
    if (duplicate) {
      toast.success(t('toast.duplicated'));
    }
  };

  const statusColor = PAGE_STATUS_COLORS[page.status];

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 h-full"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-lg">
              {page.pageNumber}
            </div>
            <div>
              <CardTitle className="text-base">
                {page.title || t('card.untitled')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t('card.page', { number: page.pageNumber })}
              </p>
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
        {page.goal && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {page.goal}
          </p>
        )}
        {page.setting && (
          <p className="text-xs text-muted-foreground mb-3 italic">
            📍 {page.setting}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Layers className="w-3 h-3" />
            {t('card.panels', { count: panelCount })}
          </span>
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ 
              borderColor: statusColor,
              color: statusColor,
            }}
          >
            {t(`status.${page.status}`)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
