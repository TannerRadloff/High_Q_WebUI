import { cookies } from 'next/headers';

import { AppSidebar } from '@/src/components/layout/app-sidebar';
import { SidebarInset } from '@/src/components/ui/sidebar';

import { getServerSession } from '@/lib/auth';
import Script from 'next/script';

export const experimental_ppr = true;

// Script to safely initialize animations after DOM is ready
const ANIMATION_INIT_SCRIPT = `\
(function() {
  function initAnimations() {
    try {
      // Wait for DOM to be fully loaded
      if (document.readyState !== 'complete') {
        window.addEventListener('load', initAnimations);
        return;
      }

      // Set animation variables with optimized defaults
      document.documentElement.style.setProperty('--animation-play-state', 'running');
      document.documentElement.style.setProperty('--animation-opacity', '1');
      document.documentElement.style.setProperty('--nebula-opacity', '0.8');
      document.documentElement.style.setProperty('--stars-opacity', '0.9');
      document.documentElement.style.setProperty('--shooting-stars-display', 'block');
      document.documentElement.style.setProperty('--body-before-opacity', '1');
      document.documentElement.style.setProperty('--body-after-opacity', '1');
      
      // Only create elements if they don't already exist
      function getOrCreateElement(selector, className, parent) {
        let element = document.querySelector(selector);
        if (!element) {
          element = document.createElement('div');
          element.className = className;
          parent.appendChild(element);
        }
        return element;
      }
      
      // Generate stars with reduced computational load
      function generateRandomStars() {
        const sessionSeed = Math.floor(Math.random() * 1000000);
        
        function seededRandom() {
          const x = Math.sin(sessionSeed++) * 10000;
          return x - Math.floor(x);
        }
        
        const randomStars = document.createElement('div');
        randomStars.className = 'random-stars';
        
        // Reduce total star count for better performance
        const starTypeSettings = [
          { count: 80, size: [0.5, 2.5], brightness: [0.4, 0.6], className: 'random-star' },
          { count: 40, size: [0.5, 3], brightness: [0.5, 0.7], className: 'random-star' },
          { count: 20, size: [1.5, 3], brightness: [0.7, 0.9], className: 'random-star bright', glow: true },
          { count: 5, size: [2, 4], brightness: [0.9, 1], className: 'random-star extra-bright', extraGlow: true }
        ];
        
        starTypeSettings.forEach(settings => {
          for (let i = 0; i < settings.count; i++) {
            const star = document.createElement('div');
            star.className = settings.className;
            
            const top = seededRandom() * 100;
            const left = seededRandom() * 100;
            const size = settings.size[0] + seededRandom() * (settings.size[1] - settings.size[0]);
            const brightness = settings.brightness[0] + seededRandom() * (settings.brightness[1] - settings.brightness[0]);
            const delay = seededRandom() * 8;
            const duration = 2 + seededRandom() * 2;
            
            star.style.top = \`\${top}%\`;
            star.style.left = \`\${left}%\`;
            star.style.width = \`\${size}px\`;
            star.style.height = \`\${size}px\`;
            star.style.opacity = brightness.toString();
            star.style.setProperty('--original-opacity', brightness.toString());
            star.style.animationDelay = \`\${delay}s\`;
            star.style.animationDuration = \`\${duration}s\`;
            
            if (settings.glow) {
              star.style.boxShadow = \`0 0 \${Math.floor(size * 2)}px \${Math.floor(size)}px rgba(255, 255, 255, 0.7)\`;
            }
            
            if (settings.extraGlow) {
              star.style.boxShadow = \`0 0 \${Math.floor(size * 3)}px \${Math.floor(size * 1.5)}px rgba(255, 255, 255, 0.8), 
                                     0 0 \${Math.floor(size * 6)}px \${Math.floor(size * 3)}px rgba(255, 255, 255, 0.4)\`;
            }
            
            randomStars.appendChild(star);
          }
        });
        
        return randomStars;
      }
      
      // Get or create required containers
      let messagesBackground = getOrCreateElement('.messages-background', 'messages-background', document.body);
      let cosmicContainer = getOrCreateElement('.cosmic-animation-container', 'cosmic-animation-container', messagesBackground);
      
      // Only add stars if they don't exist
      if (!document.querySelector('.cosmic-animation-container .random-stars')) {
        cosmicContainer.appendChild(generateRandomStars());
      }
      
      // Make randomStars globally accessible with error handling
      window.generateRandomStars = function() {
        try {
          return generateRandomStars();
        } catch (e) {
          console.error('Error generating random stars:', e);
          return document.createElement('div');
        }
      };
      
      // Set up error handling for the error overlay
      const errorOverlay = document.getElementById('error-recovery-overlay');
      if (errorOverlay) {
        // Make the retry button work
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
          retryButton.addEventListener('click', function() {
            window.location.reload();
          });
        }
        
        // Show the overlay on history error
        document.addEventListener('historyLoadError', function() {
          errorOverlay.classList.add('visible');
        });
      }
    } catch (e) {
      console.error('Error initializing animations:', e);
      // Fallback to basic styling if animations fail
      document.documentElement.style.setProperty('--animation-opacity', '0');
      document.documentElement.style.setProperty('--nebula-opacity', '0');
    }
  }

  // Initialize animations when DOM is ready or after a short delay
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    // Small delay to ensure React has rendered
    setTimeout(initAnimations, 100);
  }
})();`;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([getServerSession(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <div className="flex h-screen w-full overflow-hidden">
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
      <AppSidebar user={session?.user} />
      <SidebarInset className="flex-1 overflow-auto">
        <div className="relative w-full h-full">
          {children}
          
          {/* Error recovery overlay - appears when there's an error loading chat */}
          <div id="error-recovery-overlay" className="hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Connection Issue
              </h2>
              <p className="mb-4 text-muted-foreground">We're having trouble loading your chat history. This could be due to a temporary network issue.</p>
              <div className="flex justify-end gap-2">
                <button 
                  id="retry-button"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={() => window.location.reload()}
                  aria-label="Retry loading chat history">
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </div>
  );
}


