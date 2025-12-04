'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Trash2, X, Download, CheckCircle2, Filter, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ImageSelectionToolbarProps {
  /** Total number of images displayed */
  totalCount: number;
  /** Number of currently selected images */
  selectedCount: number;
  /** Whether selection mode is active */
  selectionMode: boolean;
  /** Whether a delete operation is in progress */
  isDeleting: boolean;
  /** Whether an export operation is in progress */
  isExporting: boolean;
  /** Available tags for filtering */
  allTags: string[];
  /** Currently active filter tag */
  filterTag: string | null;
  /** Text to show when filter is active */
  filterText?: string;
  /** Callback to toggle selection mode */
  onToggleSelectionMode: () => void;
  /** Callback to select all images */
  onSelectAll: () => void;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to delete selected images */
  onDeleteSelected: () => void;
  /** Callback to export selected images */
  onExportSelected: () => void;
  /** Callback when a filter tag is selected */
  onFilterChange: (tag: string | null) => void;
}

/**
 * Toolbar for image grid showing selection controls and filtering
 */
export function ImageSelectionToolbar({
  totalCount,
  selectedCount,
  selectionMode,
  isDeleting,
  isExporting,
  allTags,
  filterTag,
  filterText,
  onToggleSelectionMode,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onFilterChange,
}: ImageSelectionToolbarProps) {
  const t = useTranslations('media.grid');
  const tCommon = useTranslations('common');

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t('imageCount', { count: totalCount })}
          {filterText && ` ${filterText}`}
        </span>
        {selectionMode && selectedCount > 0 && (
          <span className="text-sm font-medium text-primary">
            • {t('selected', { count: selectedCount })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Tag filter dropdown */}
        {allTags.length > 0 && !selectionMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filterTag || tCommon('actions.filter')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filterTag && (
                <>
                  <DropdownMenuItem onClick={() => onFilterChange(null)}>
                    {tCommon('actions.clearFilter')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {allTags.map(tag => (
                <DropdownMenuItem 
                  key={tag} 
                  onClick={() => onFilterChange(tag)}
                  className={filterTag === tag ? 'bg-accent' : ''}
                >
                  <Tag className="h-3 w-3 mr-2" />
                  {tag}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {selectionMode ? (
          <>
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              {t('toolbar.selectAll')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              {tCommon('actions.clear')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportSelected}
              disabled={selectedCount === 0 || isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('toolbar.export', { count: selectedCount })}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0 || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('toolbar.delete', { count: selectedCount })}
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleSelectionMode}>
              <X className="h-4 w-4 mr-2" />
              {t('toolbar.cancel')}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onToggleSelectionMode}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t('toolbar.select')}
          </Button>
        )}
      </div>
    </div>
  );
}
