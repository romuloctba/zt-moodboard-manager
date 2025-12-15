'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Edition } from '@/types';
import { imageRepository } from '@/lib/db/repositories';

interface ScriptCoverProps {
  edition: Edition;
}

/**
 * Renders the cover/title page of the script
 * Shows edition info, cover description, and metadata
 */
export function ScriptCover({ edition }: ScriptCoverProps) {
  const t = useTranslations('editions.export');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadCover() {
      if (edition.coverImageId) {
        const image = await imageRepository.getById(edition.coverImageId);
        if (image) {
          const url = await imageRepository.getImageUrl(image);
          setCoverUrl(url);
        }
      }
    }
    loadCover();
  }, [edition.coverImageId]);

  return (
    <section className="script-cover mb-8 break-after-page text-center">
      {/* Title */}
      <div className="py-12">
        <h1 className="text-3xl font-bold uppercase tracking-widest mb-4">
          {edition.title}
        </h1>
        
        {/* Issue/Volume info */}
        {(edition.issueNumber || edition.volume) && (
          <p className="text-lg mb-2">
            {edition.issueNumber && t('issue', { number: edition.issueNumber })}
            {edition.issueNumber && edition.volume && ' • '}
            {edition.volume && t('volume', { number: edition.volume })}
          </p>
        )}

        {/* Genre and audience */}
        {(edition.metadata?.genre || edition.metadata?.targetAudience) && (
          <p className="text-sm text-muted-foreground">
            {[edition.metadata?.genre, edition.metadata?.targetAudience].filter(Boolean).join(' | ')}
          </p>
        )}
      </div>

      {/* Synopsis */}
      {edition.synopsis && (
        <div className="max-w-xl mx-auto mb-8">
          <h2 className="font-bold uppercase tracking-wide mb-2 text-sm">
            {t('synopsis')}
          </h2>
          <p className="text-sm leading-relaxed">
            {edition.synopsis}
          </p>
        </div>
      )}

      {/* Cover Image */}
      {coverUrl && (
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={t('coverImage')}
            className="max-w-xs mx-auto rounded shadow-lg print:max-w-[200px]"
          />
        </div>
      )}

      {/* Cover Description */}
      {edition.coverDescription && (
        <div className="max-w-xl mx-auto text-left border-t pt-6">
          <h2 className="font-bold uppercase tracking-wide mb-2 text-sm text-center">
            {t('coverDescription')}
          </h2>
          <p className="text-sm leading-relaxed">
            {edition.coverDescription}
          </p>
        </div>
      )}

      {/* Metadata notes */}
      {edition.metadata?.notes && (
        <div className="max-w-xl mx-auto mt-6 text-left">
          <h2 className="font-bold uppercase tracking-wide mb-2 text-sm text-center">
            {t('editionNotes')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {edition.metadata.notes}
          </p>
        </div>
      )}

      {/* Export date */}
      <p className="mt-12 text-xs text-muted-foreground">
        {t('exportedOn', { date: new Date().toLocaleDateString() })}
      </p>
    </section>
  );
}
