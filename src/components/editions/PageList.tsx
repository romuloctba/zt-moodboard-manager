'use client';

import { useEffect, useState } from 'react';
import type { ScriptPage } from '@/types';
import { PageCard } from './PageCard';
import { scriptPageRepository } from '@/lib/db/repositories';

interface PageListProps {
  pages: ScriptPage[];
  onPageClick: (page: ScriptPage) => void;
}

interface PageStats {
  [pageId: string]: number;
}

export function PageList({ pages, onPageClick }: PageListProps) {
  const [panelCounts, setPanelCounts] = useState<PageStats>({});

  useEffect(() => {
    async function loadStats() {
      const counts: PageStats = {};
      for (const page of pages) {
        counts[page.id] = await scriptPageRepository.getPanelCount(page.id);
      }
      setPanelCounts(counts);
    }
    loadStats();
  }, [pages]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {pages.map((page) => (
        <PageCard
          key={page.id}
          page={page}
          panelCount={panelCounts[page.id] ?? 0}
          onClick={() => onPageClick(page)}
        />
      ))}
    </div>
  );
}
