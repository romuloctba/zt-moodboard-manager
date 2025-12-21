'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Edition } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ImageIcon } from 'lucide-react';
import { imageRepository } from '@/lib/db/repositories';
import { cn } from '@/lib/utils';

interface CoverCardProps {
  edition: Edition;
  onClick?: () => void;
}

/**
 * Displays the edition cover as a special "page 0" card
 * Shows cover image (if available) and cover description
 */
export function CoverCard({ edition, onClick }: CoverCardProps) {
  const t = useTranslations('editions.cover');
  const tCard = useTranslations('editions.card');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadCover() {
      if (edition.coverImageId) {
        const image = await imageRepository.getById(edition.coverImageId);
        if (image) {
          const url = await imageRepository.getThumbnailUrl(image);
          setCoverUrl(url);
        }
      } else {
        setCoverUrl(null);
      }
    }
    loadCover();
  }, [edition.coverImageId]);

  const hasCoverContent = coverUrl || edition.coverDescription;

  return (
    <Card
      className={cn(
        "transition-all border-2 border-dashed",
        onClick && "cursor-pointer hover:shadow-lg hover:border-primary/50",
        hasCoverContent ? "border-primary/30 bg-primary/5" : "border-muted-foreground/25"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Cover thumbnail or icon */}
            <div className={cn(
              "w-12 h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0",
              !coverUrl && "bg-primary/10"
            )}>
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={t('currentCover')}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {t('cardTitle')}
                <Badge variant="outline" className="text-xs font-normal">
                  {t('pageZero')}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {edition.title}
                {edition.issueNumber && ` • ${tCard('issue', { number: edition.issueNumber })}`}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {edition.coverDescription ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {edition.coverDescription}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {t('noDescription')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
