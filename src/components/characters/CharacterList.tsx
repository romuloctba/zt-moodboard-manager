'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Character } from '@/types';
import { CharacterCard } from './CharacterCard';
import { imageRepository } from '@/lib/db/repositories';

interface CharacterListProps {
  characters: Character[];
}

export function CharacterList({ characters }: CharacterListProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string || new URLSearchParams(window.location.search).get('projectId');
  const [imageCounts, setImageCounts] = useState<Record<string, number>>({});

  // Fetch image counts for all characters
  useEffect(() => {
    async function fetchImageCounts() {
      const counts: Record<string, number> = {};
      await Promise.all(
        characters.map(async (char) => {
          const images = await imageRepository.getByCharacterId(char.id);
          counts[char.id] = images.length;
        })
      );
      setImageCounts(counts);
    }
    fetchImageCounts();
  }, [characters]);

  const handleCharacterClick = (character: Character) => {
    router.push(`/projects/view/character?projectId=${projectId}&characterId=${character.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          imageCount={imageCounts[character.id] ?? 0}
          onClick={() => handleCharacterClick(character)}
        />
      ))}
    </div>
  );
}
