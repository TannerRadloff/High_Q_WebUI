import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AnimationToggle } from '@/components/animation-toggle';

import { auth } from '../(auth)/auth';
import Script from 'next/script';

export const experimental_ppr = true;

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
  
  // Check if animation elements exist, if not, create them
  const body = document.body;
  
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
})();`;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: ANIMATION_INIT_SCRIPT,
        }}
      />
      <Script src="/animation-diagnostic.js" strategy="afterInteractive" />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={session?.user} />
        <SidebarInset>
          {/* Animation elements are now created by the script if they don't exist */}
          {children}
        </SidebarInset>
        <AnimationToggle />
      </SidebarProvider>
    </>
  );
}
