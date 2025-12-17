'use client';

import { useEffect, useState } from 'react';
import type { ScriptPage, Edition } from '@/types';
import { PageCard } from './PageCard';
import { CoverCard } from './CoverCard';
import { scriptPageRepository } from '@/lib/db/repositories';
import { useEditionStore } from '@/store/editionStore';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PagesGridProps {
  edition: Edition;
  pages: ScriptPage[];
  onPageClick: (page: ScriptPage) => void;
  onCoverClick: () => void;
  emptyState?: React.ReactNode;
}

interface SortablePageCardProps {
  page: ScriptPage;
  panelCount: number;
  onClick: () => void;
}

function SortablePageCard({ page, panelCount, onClick }: SortablePageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag Handle - positioned on the left edge */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        className="absolute left-0 top-0 bottom-0 w-6 z-10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-gradient-to-r from-muted/80 to-transparent opacity-0 group-hover/sortable:opacity-100 transition-opacity rounded-l-lg md:w-5"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {/* Always visible drag indicator on mobile */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-muted-foreground/20 rounded-l-lg md:hidden" />
      <PageCard
        page={page}
        panelCount={panelCount}
        onClick={onClick}
      />
    </div>
  );
}

export function PagesGrid({
  edition,
  pages,
  onPageClick,
  onCoverClick,
  emptyState,
}: PagesGridProps) {
  const { reorderPages } = useEditionStore();
  const [panelCounts, setPanelCounts] = useState<Record<string, number>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    async function loadStats() {
      const counts: Record<string, number> = {};
      for (const page of pages) {
        counts[page.id] = await scriptPageRepository.getPanelCount(page.id);
      }
      setPanelCounts(counts);
    }
    if (pages.length > 0) {
      loadStats();
    }
  }, [pages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedPages.findIndex((p) => p.id === active.id);
      const newIndex = sortedPages.findIndex((p) => p.id === over.id);

      const newOrder = arrayMove(sortedPages, oldIndex, newIndex);
      const pageIds = newOrder.map((p) => p.id);

      // Update the order in the database
      reorderPages(pageIds);
    }
  };

  // Empty state - no drag context needed
  if (pages.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <CoverCard edition={edition} onClick={onCoverClick} />
        {emptyState && (
          <div className="col-span-full">
            {emptyState}
          </div>
        )}
      </div>
    );
  }

  // With pages - sortable grid
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedPages.map((p) => p.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Cover Card - first item, not part of sortable items so not draggable */}
          <CoverCard edition={edition} onClick={onCoverClick} />

          {/* Sortable Page Cards */}
          {sortedPages.map((page) => (
            <SortablePageCard
              key={page.id}
              page={page}
              panelCount={panelCounts[page.id] ?? 0}
              onClick={() => onPageClick(page)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
