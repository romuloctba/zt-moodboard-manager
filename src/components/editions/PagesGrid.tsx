'use client';

import { useEffect, useState } from 'react';
import type { ScriptPage, Edition } from '@/types';
import { PageCard } from './PageCard';
import { CoverCard } from './CoverCard';
import { scriptPageRepository } from '@/lib/db/repositories';
import { useEditionStore } from '@/store/editionStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
        distance: 8, // Require 8px movement before starting drag
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
