'use client';

import Link from 'next/link';
import { Cloud, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface SyncLinkCardProps {
  isConnected: boolean;
  googleEmail?: string | null;
  labels: {
    title: string;
    description: string;
    connected: string;
    notConnected: string;
    manageSync: string;
  };
}

/**
 * Simple card that links to the dedicated sync page
 * Shows connection status and provides navigation
 */
export function SyncLinkCard({
  isConnected,
  googleEmail,
  labels,
}: SyncLinkCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          {labels.title}
        </CardTitle>
        <CardDescription>
          {labels.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
                  {labels.connected}
                </Badge>
                {googleEmail && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {googleEmail}
                  </span>
                )}
              </>
            ) : (
              <Badge variant="secondary">
                {labels.notConnected}
              </Badge>
            )}
          </div>
          
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sync" className="flex items-center gap-1">
              {labels.manageSync}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
