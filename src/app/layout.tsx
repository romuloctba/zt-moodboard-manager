import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/layout/Footer";
import { LocaleProvider } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moodboard Manager",
  description: "Visual reference management for character creators, graphic novel artists, and storytellers. Offered by Zoch Tecnologia.",
  manifest: "/moodboard-manager/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Moodboard",
  },
  formatDetection: {
    telephone: false,
  },
  applicationName: "Moodboard Manager",
  keywords: ["moodboard", "character design", "graphic novel", "visual reference", "concept art"],
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/moodboard-manager/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/moodboard-manager/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <LocaleProvider>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
