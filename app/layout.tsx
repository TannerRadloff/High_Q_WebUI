import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'Next.js Chatbot Template',
  description: 'Next.js chatbot template using the AI SDK.',
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

// Script to ensure animations are properly initialized
const ANIMATION_INIT_SCRIPT = `\
(function() {
  // Set animation variables
  document.documentElement.style.setProperty('--animation-play-state', 'running');
  document.documentElement.style.setProperty('--nebula-opacity', '0.7');
  document.documentElement.style.setProperty('--stars-opacity', '0.7');
  document.documentElement.style.setProperty('--shooting-stars-display', 'block');
  
  // Force animation restart by briefly pausing and resuming
  setTimeout(function() {
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
    setTimeout(function() {
      document.documentElement.style.setProperty('--animation-play-state', 'running');
    }, 50);
  }, 100);
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: ANIMATION_INIT_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <div className="aurora">
            <div className="light"></div>
            <div className="light light-2"></div>
            <div className="light light-3"></div>
          </div>
          <div className="shooting-star">
            <div className="star-1"></div>
            <div className="star-2"></div>
            <div className="star-3"></div>
          </div>
          <div className="cosmic-dust"></div>
          <div className="pulsating-stars">
            <div className="star star-1"></div>
            <div className="star star-2"></div>
            <div className="star star-3"></div>
            <div className="star star-4"></div>
            <div className="star star-5"></div>
            <div className="star star-6"></div>
          </div>
          <div className="parallax-stars">
            <div className="layer layer-1"></div>
            <div className="layer layer-2"></div>
            <div className="layer layer-3"></div>
          </div>
          <Toaster position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
