'use client';

import { useEffect, useState } from 'react';
import type { Edition } from '@/types';
import { EditionCard } from './EditionCard';
import { editionRepository } from '@/lib/db/repositories';

interface EditionListProps {
  editions: Edition[];
  onEditionClick: (edition: Edition) => void;
}

interface EditionStats {
  [editionId: string]: { pages: number; panels: number };
}

export function EditionList({ editions, onEditionClick }: EditionListProps) {
  const [stats, setStats] = useState<EditionStats>({});

  useEffect(() => {
    async function loadStats() {
      const newStats: EditionStats = {};
      for (const edition of editions) {
        newStats[edition.id] = await editionRepository.getStats(edition.id);
      }
      setStats(newStats);
    }
    loadStats();
  }, [editions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {editions.map((edition) => (
        <EditionCard
          key={edition.id}
          edition={edition}
          pageCount={stats[edition.id]?.pages ?? 0}
          onClick={() => onEditionClick(edition)}
        />
      ))}
    </div>
  );
}
