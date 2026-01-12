'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Rocket, Users, Palette, FileText, Cloud, Globe, 
  Smartphone, Lightbulb, Zap, ArrowLeft, BookOpen,
  Image, Layout, Pencil, Database, HelpCircle
} from 'lucide-react';

export default function HelpPage() {
  const t = useTranslations('help');
  const tCommon = useTranslations('common');

  const quickStartSteps = [
    { icon: Pencil, key: 'step1' },
    { icon: Users, key: 'step2' },
    { icon: Rocket, key: 'step3' },
  ];

  const features = [
    { icon: FileText, key: 'projects', color: 'text-blue-500' },
    { icon: Users, key: 'characters', color: 'text-purple-500' },
    { icon: Palette, key: 'canvas', color: 'text-pink-500' },
    { icon: BookOpen, key: 'scripts', color: 'text-green-500' },
    { icon: Database, key: 'storage', color: 'text-orange-500' },
    { icon: Cloud, key: 'sync', color: 'text-cyan-500' },
    { icon: Globe, key: 'i18n', color: 'text-indigo-500' },
    { icon: Smartphone, key: 'pwa', color: 'text-rose-500' },
  ];

  const workflows = [
    { icon: Image, key: 'characterDesign' },
    { icon: Zap, key: 'quickCapture' },
    { icon: BookOpen, key: 'comicScript' },
    { icon: Cloud, key: 'crossDevice' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={t('title')}
        backHref="/"
        actions={[]}
      />

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Palette className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('hero.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{t('hero.feature1')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Palette className="w-4 h-4" />
              <span>{t('hero.feature2')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cloud className="w-4 h-4" />
              <span>{t('hero.feature3')}</span>
            </div>
          </div>
        </div>

        <Separator className="mb-12" />

        {/* Quick Start */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">{t('quickStart.title')}</h2>
          </div>
          <p className="text-muted-foreground mb-8">{t('quickStart.subtitle')}</p>
          
          <div className="grid gap-6 md:grid-cols-3">
            {quickStartSteps.map((step, idx) => (
              <Card key={step.key} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full" />
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-primary/20">{idx + 1}</span>
                  </div>
                  <CardTitle>{t(`quickStart.${step.key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t(`quickStart.${step.key}.description`)}
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs">
                    <p className="font-medium mb-1">{t('quickStart.proTip')}</p>
                    <p className="text-muted-foreground">
                      {t(`quickStart.${step.key}.tip`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="mb-12" />

        {/* Core Features */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">{t('features.title')}</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.key} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    <CardTitle>{t(`features.${feature.key}.title`)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {t(`features.${feature.key}.description`)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="mb-12" />

        {/* Common Workflows */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Layout className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">{t('workflows.title')}</h2>
          </div>
          
          <div className="space-y-4">
            {workflows.map((workflow, idx) => (
              <Card key={workflow.key}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <workflow.icon className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg">
                      {t(`workflows.${workflow.key}.title`)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    {Array.from({ length: 5 }).map((_, stepIdx) => (
                      <li key={stepIdx} className="flex gap-3">
                        <span className="font-medium text-primary min-w-[1.5rem]">
                          {stepIdx + 1}.
                        </span>
                        <span>{t(`workflows.${workflow.key}.step${stepIdx + 1}`)}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="mb-12" />

        {/* Pro Tips */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">{t('proTips.title')}</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {['quickCapture', 'imageManagement', 'canvasOrganization', 'scriptWriting'].map((tip) => (
              <Card key={tip} className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    {t(`proTips.${tip}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(`proTips.${tip}.description`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="mb-12" />

        {/* Troubleshooting */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">{t('troubleshooting.title')}</h2>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {['sync', 'storage', 'images', 'performance'].map((issue) => (
                  <div key={issue}>
                    <h3 className="font-semibold mb-2 text-lg">
                      {t(`troubleshooting.${issue}.title`)}
                    </h3>
                    <div className="space-y-3 pl-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {t('troubleshooting.problem')}
                        </p>
                        <p className="text-sm">{t(`troubleshooting.${issue}.problem`)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          {t('troubleshooting.solution')}
                        </p>
                        <p className="text-sm">{t(`troubleshooting.${issue}.solution`)}</p>
                      </div>
                    </div>
                    {issue !== 'performance' && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action */}
        <div className="text-center py-12 px-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <h2 className="text-2xl font-bold mb-4">{t('cta.title')}</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            {t('cta.description')}
          </p>
          <Button size="lg" asChild>
            <Link href="/">
              <Rocket className="w-4 h-4 mr-2" />
              {t('cta.button')}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
