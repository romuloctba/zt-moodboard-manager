'use client';

import { useTranslations } from 'next-intl';
import type { Edition, ScriptPage, Panel } from '@/types';
import { ScriptCover } from './ScriptCover';
import { ScriptPageSection } from './ScriptPageSection';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ScriptDocumentProps {
  edition: Edition;
  pages: ScriptPage[];
  panelsByPage: Record<string, Panel[]>;
  projectId: string;
}

/**
 * Main script document component
 * Renders the full edition as a printable script
 */
export function ScriptDocument({ 
  edition, 
  pages, 
  panelsByPage,
  projectId,
}: ScriptDocumentProps) {
  const t = useTranslations('editions.export');

  const handlePrint = () => {
    window.print();
  };

  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  // Calculate totals for summary
  const totalPanels = Object.values(panelsByPage).reduce((sum, panels) => sum + panels.length, 0);
  const totalDialogues = Object.values(panelsByPage).reduce((sum, panels) => 
    sum + panels.reduce((pSum, panel) => pSum + panel.dialogues.length, 0), 0
  );

  return (
    <div className="script-document min-h-screen bg-white text-black">
      {/* Toolbar - Hidden when printing */}
      <div data-print-hidden className="no-print sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/projects/view/editions?editionId=${edition.id}&projectId=${projectId}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToEdition')}
            </Link>
            <span className="text-sm font-medium">{edition.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              {t('printScript')}
            </Button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <article className="script-content max-w-3xl mx-auto px-8 py-12 print:px-0 print:py-0 print:max-w-none">
        {/* Cover Page */}
        <ScriptCover edition={edition} />

        {/* Summary - on its own page */}
        <section className="script-summary mb-8 break-after-page">
          <h2 className="font-bold text-xl uppercase tracking-wide mb-4 border-b-2 border-foreground pb-2">
            {t('summary')}
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="p-4 bg-muted/20 rounded print:bg-gray-50">
              <p className="text-2xl font-bold">{pages.length}</p>
              <p className="text-sm text-primary-foreground">{t('totalPages')}</p>
            </div>
            <div className="p-4 bg-muted/20 rounded print:bg-gray-50">
              <p className="text-2xl font-bold">{totalPanels}</p>
              <p className="text-sm text-primary-foreground">{t('totalPanels')}</p>
            </div>
            <div className="p-4 bg-muted/20 rounded print:bg-gray-50">
              <p className="text-2xl font-bold">{totalDialogues}</p>
              <p className="text-sm text-primary-foreground">{t('totalDialogues')}</p>
            </div>
          </div>

          {/* Table of Contents */}
          <h3 className="font-bold uppercase tracking-wide mb-3 text-sm">
            {t('tableOfContents')}
          </h3>
          <ul className="text-sm space-y-1">
            {sortedPages.map((page) => (
              <li key={page.id} className="flex items-baseline gap-2">
                <span className="font-mono">{String(page.pageNumber).padStart(2, '0')}</span>
                <span className="flex-1 border-b border-dotted border-muted-foreground/30" />
                <span className="text-muted-foreground">
                  {page.title || t('untitledPage')}
                  {' '}({panelsByPage[page.id]?.length || 0} {t('panelsAbbrev')})
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Script Pages */}
        {sortedPages.map((page) => (
          <ScriptPageSection
            key={page.id}
            page={page}
            panels={panelsByPage[page.id] || []}
          />
        ))}

        {/* End marker */}
        <div className="text-center py-8 border-t-2 border-foreground mt-8">
          <p className="font-bold uppercase tracking-widest">— {t('endOfScript')} —</p>
          <p className="text-sm text-muted-foreground mt-2">
            {edition.title} • {pages.length} {t('pagesLower')} • {totalPanels} {t('panelsLower')}
          </p>
        </div>
      </article>
    </div>
  );
}
