'use client';

import { useTranslations } from 'next-intl';
import type { ScriptPage, Panel } from '@/types';
import { ScriptPanel } from './ScriptPanel';

interface ScriptPageSectionProps {
  page: ScriptPage;
  panels: Panel[];
}

/**
 * Renders a complete script page with all its panels
 * Follows comic script page format: PAGE X (Y PANELS)
 */
export function ScriptPageSection({ page, panels }: ScriptPageSectionProps) {
  const t = useTranslations('editions.export');

  const sortedPanels = panels.sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="script-page mb-8 break-before-page first:break-before-auto">
      {/* Page Header */}
      <header className="mb-4 pb-2 border-b-2 border-foreground">
        <h3 className="font-bold text-lg uppercase tracking-wide">
          {t('pageHeader', { number: page.pageNumber, panelCount: panels.length })}
        </h3>
        
        {/* Page title if present */}
        {page.title && (
          <p className="text-sm font-medium mt-1">
            {page.title}
          </p>
        )}
      </header>

      {/* Page Metadata */}
      <div className="script-page-meta mb-4 text-sm space-y-1">
        {page.setting && (
          <p>
            <span className="font-semibold uppercase">{t('setting')}:</span>{' '}
            {page.setting}
          </p>
        )}
        {page.timeOfDay && (
          <p>
            <span className="font-semibold uppercase">{t('time')}:</span>{' '}
            {page.timeOfDay}
          </p>
        )}
        {page.mood && (
          <p>
            <span className="font-semibold uppercase">{t('mood')}:</span>{' '}
            {page.mood}
          </p>
        )}
        {page.goal && (
          <p className="italic text-muted-foreground">
            <span className="font-semibold uppercase not-italic">{t('goal')}:</span>{' '}
            {page.goal}
          </p>
        )}
      </div>

      {/* Writer Notes */}
      {page.notes && (
        <div className="mb-4 p-3 bg-muted/10 rounded border-l-4 border-muted-foreground/30 text-sm print:bg-gray-20">
          <span className="font-semibold uppercase text-primary">
            {t('writerNotes')}:
          </span>{' '}
          <span className="text-primary">{page.notes}</span>
        </div>
      )}

      {/* Panels */}
      <div className="script-panels">
        {sortedPanels.length > 0 ? (
          sortedPanels.map((panel) => (
            <ScriptPanel key={panel.id} panel={panel} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t('noPanels')}
          </p>
        )}
      </div>
    </section>
  );
}
