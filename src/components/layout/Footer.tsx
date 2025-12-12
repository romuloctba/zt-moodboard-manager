'use client';

import Link from "next/link";
import { Button } from "../ui/button";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0-dev';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>© {year}</span>
            <a 
              href="https://zochtecnologia.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors"
            >
              Zoch Tecnologia
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center">
            <Link
              href="/privacy"
              className="font-medium hover:text-foreground transition-colors"
            >
              Política de Privacidade / Privacy Policy
            </Link>
          </div>
          <div>
            <span className="font-mono">v{APP_VERSION}</span>
            <Button variant={"ghost"} onClick={() => window.location.reload()}><span>Check for updates</span></Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
