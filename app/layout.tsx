import type { Metadata } from 'next';
import Script from 'next/script';
import { cn } from '@/utils/formatting';
import { Inter } from 'next/font/google';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { LayoutContent } from './layout-content';

import './globals.css';
import './modern-ui.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'AI Chatbot',
  description: 'Next.js AI Chatbot with Supabase Auth',
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', '${DARK_THEME_COLOR}');
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-color-script" strategy="beforeInteractive">
          {THEME_COLOR_SCRIPT}
        </Script>
        <Script
          id="nextjs-core"
          strategy="beforeInteractive"
          src="/_next/static/chunks/webpack.js"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          // Light mode radial gradient for subtle depth effect
          'bg-gradient-to-tr from-background via-background to-muted/30',
          // Dark mode cosmic effect background
          'dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(2,0,15,0))]',
          inter.className
        )}
      >
        <LayoutContent>{children}</LayoutContent>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}


