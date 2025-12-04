'use client';

import { useRouter, useParams } from 'next/navigation';
import type { Character } from '@/types';
import { CharacterCard } from './CharacterCard';

interface CharacterListProps {
  characters: Character[];
}

export function CharacterList({ characters }: CharacterListProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const handleCharacterClick = (character: Character) => {
    router.push(`/projects/${projectId}/characters/${character.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          onClick={() => handleCharacterClick(character)}
        />
      ))}
    </div>
  );
}
