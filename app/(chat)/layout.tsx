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
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={session?.user} />
        <SidebarInset>
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
          {children}
        </SidebarInset>
        <AnimationToggle />
      </SidebarProvider>
    </>
  );
}
