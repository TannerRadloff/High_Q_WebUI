import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import Script from 'next/script';

import { ThemeProvider } from '@/components/theme-provider';
import { AnimationToggle } from '@/components/animation-toggle';

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

// Enhanced animation initialization script
const ANIMATION_INIT_SCRIPT = `\
(function() {
  // Set animation variables
  document.documentElement.style.setProperty('--animation-play-state', 'running');
  document.documentElement.style.setProperty('--nebula-opacity', '0.7');
  document.documentElement.style.setProperty('--stars-opacity', '0.7');
  document.documentElement.style.setProperty('--shooting-stars-display', 'block');
  
  // Check if animation elements exist, if not, create them
  const body = document.body;
  
  function createAnimationElements() {
    if (!document.querySelector('.aurora')) {
      const aurora = document.createElement('div');
      aurora.className = 'aurora';
      
      const light1 = document.createElement('div');
      light1.className = 'light';
      
      const light2 = document.createElement('div');
      light2.className = 'light light-2';
      
      const light3 = document.createElement('div');
      light3.className = 'light light-3';
      
      aurora.appendChild(light1);
      aurora.appendChild(light2);
      aurora.appendChild(light3);
      
      body.prepend(aurora);
    }
    
    if (!document.querySelector('.shooting-star')) {
      const shootingStar = document.createElement('div');
      shootingStar.className = 'shooting-star';
      
      const star1 = document.createElement('div');
      star1.className = 'star-1';
      
      const star2 = document.createElement('div');
      star2.className = 'star-2';
      
      const star3 = document.createElement('div');
      star3.className = 'star-3';
      
      shootingStar.appendChild(star1);
      shootingStar.appendChild(star2);
      shootingStar.appendChild(star3);
      
      body.prepend(shootingStar);
    }
    
    if (!document.querySelector('.cosmic-dust')) {
      const cosmicDust = document.createElement('div');
      cosmicDust.className = 'cosmic-dust';
      body.prepend(cosmicDust);
    }
    
    if (!document.querySelector('.pulsating-stars')) {
      const pulsatingStars = document.createElement('div');
      pulsatingStars.className = 'pulsating-stars';
      
      for (let i = 1; i <= 6; i++) {
        const star = document.createElement('div');
        star.className = 'star star-' + i;
        pulsatingStars.appendChild(star);
      }
      
      body.prepend(pulsatingStars);
    }
    
    if (!document.querySelector('.parallax-stars')) {
      const parallaxStars = document.createElement('div');
      parallaxStars.className = 'parallax-stars';
      
      for (let i = 1; i <= 3; i++) {
        const layer = document.createElement('div');
        layer.className = 'layer layer-' + i;
        parallaxStars.appendChild(layer);
      }
      
      body.prepend(parallaxStars);
    }
  }
  
  // Create animation elements immediately
  createAnimationElements();
  
  // Also try again after a short delay to handle any race conditions
  setTimeout(function() {
    createAnimationElements();
    
    // Force animation restart by briefly pausing and resuming
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
    setTimeout(function() {
      document.documentElement.style.setProperty('--animation-play-state', 'running');
    }, 50);
  }, 100);
  
  // And try one more time after the page has fully loaded
  window.addEventListener('load', function() {
    createAnimationElements();
    
    // Force animation restart
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
    setTimeout(function() {
      document.documentElement.style.setProperty('--animation-play-state', 'running');
    }, 50);
  });
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
          {/* Animation elements are now created by the script */}
          <Script src="/animation-diagnostic.js" strategy="afterInteractive" />
          <AnimationToggle />
          <Toaster position="top-center" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
