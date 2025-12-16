'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Panel, Character } from '@/types';
import { PanelEditor } from './PanelEditor';
import { Button } from '@/components/ui/button';
import { Plus, Layers } from 'lucide-react';
import { useEditionStore } from '@/store/editionStore';
import { toast } from 'sonner';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface PanelListProps {
  panels: Panel[];
  characters?: Character[];
}

export function PanelList({ panels, characters = [] }: PanelListProps) {
  const t = useTranslations('editions.panels');
  const { createPanel, reorderPanels } = useEditionStore();
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(
    new Set([])
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedPanels = [...panels].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAddPanel = async () => {
    const panel = await createPanel();
    if (panel) {
      setExpandedPanels(prev => new Set([...prev, panel.id]));
      toast.success(t('toast.created'));
    }
  };

  const toggleExpand = (panelId: string) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPanels(new Set(panels.map(p => p.id)));
  };

  const collapseAll = () => {
    setExpandedPanels(new Set());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedPanels.findIndex((p) => p.id === active.id);
      const newIndex = sortedPanels.findIndex((p) => p.id === over.id);

      const newOrder = arrayMove(sortedPanels, oldIndex, newIndex);
      const panelIds = newOrder.map((p) => p.id);
      
      // Update the order in the database
      reorderPanels(panelIds);
    }
  };

  if (panels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Layers className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{t('emptyState.title')}</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          {t('emptyState.description')}
        </p>
        <Button onClick={handleAddPanel}>
          <Plus className="w-4 h-4 mr-2" />
          {t('emptyState.action')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{t('header.title')}</h3>
          <span className="text-sm text-muted-foreground">
            ({panels.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button size="sm" onClick={handleAddPanel}>
            <Plus className="w-4 h-4 mr-1" />
            {t('header.newPanel')}
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedPanels.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {sortedPanels.map((panel) => (
              <PanelEditor
                key={panel.id}
                panel={panel}
                characters={characters}
                isExpanded={expandedPanels.has(panel.id)}
                onToggleExpand={() => toggleExpand(panel.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleAddPanel}
      >
        <Plus className="w-4 h-4 mr-2" />
        {t('header.newPanel')}
      </Button>
    </div>
  );
}

