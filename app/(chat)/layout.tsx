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
  document.documentElement.style.setProperty('--animation-opacity', '1');
  document.documentElement.style.setProperty('--nebula-opacity', '0.9');
  document.documentElement.style.setProperty('--stars-opacity', '0.9');
  document.documentElement.style.setProperty('--shooting-stars-display', 'block');
  document.documentElement.style.setProperty('--body-before-opacity', '1');
  document.documentElement.style.setProperty('--body-after-opacity', '1');
  
  // Function to generate random stars
  function generateRandomStars() {
    // Generate a unique seed for this session
    const sessionSeed = Math.floor(Math.random() * 1000000);
    
    // Simple random function with seed
    function seededRandom() {
      const x = Math.sin(sessionSeed++) * 10000;
      return x - Math.floor(x);
    }
    
    // Create random star field
    const randomStars = document.createElement('div');
    randomStars.className = 'random-stars';
    
    // Generate stars in different regions with varying densities
    
    // Dense cluster region (50-80 stars)
    const clusterStarCount = 50 + Math.floor(seededRandom() * 30);
    const clusterCenterX = 20 + seededRandom() * 60; // 20-80% of screen width
    const clusterCenterY = 20 + seededRandom() * 60; // 20-80% of screen height
    
    for (let i = 0; i < clusterStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star';
      
      // Position within cluster (Gaussian-like distribution)
      const angle = seededRandom() * Math.PI * 2;
      const distance = seededRandom() * seededRandom() * 30; // Concentrate toward center
      const top = clusterCenterY + Math.sin(angle) * distance;
      const left = clusterCenterX + Math.cos(angle) * distance;
      
      // Random size (0.5px - 3px)
      const size = 0.5 + seededRandom() * 2.5;
      
      // Random brightness
      const brightness = 0.5 + seededRandom() * 0.5;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      const duration = 3 + seededRandom() * 4;
      
      // Apply styles
      star.style.top = \`\${top}%\`;
      star.style.left = \`\${left}%\`;
      star.style.width = \`\${size}px\`;
      star.style.height = \`\${size}px\`;
      star.style.opacity = brightness.toString();
      star.style.animationDelay = \`\${delay}s\`;
      star.style.animationDuration = \`\${duration}s\`;
      
      randomStars.appendChild(star);
    }
    
    // Scattered stars throughout (40-60 stars)
    const scatteredStarCount = 40 + Math.floor(seededRandom() * 20);
    
    for (let i = 0; i < scatteredStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star';
      
      // Random position across entire screen
      const top = seededRandom() * 100;
      const left = seededRandom() * 100;
      
      // Random size (0.5px - 2px)
      const size = 0.5 + seededRandom() * 1.5;
      
      // Random brightness
      const brightness = 0.4 + seededRandom() * 0.6;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      const duration = 3 + seededRandom() * 4;
      
      // Apply styles
      star.style.top = \`\${top}%\`;
      star.style.left = \`\${left}%\`;
      star.style.width = \`\${size}px\`;
      star.style.height = \`\${size}px\`;
      star.style.opacity = brightness.toString();
      star.style.animationDelay = \`\${delay}s\`;
      star.style.animationDuration = \`\${duration}s\`;
      
      randomStars.appendChild(star);
    }
    
    // Bright highlight stars (10-15 stars)
    const brightStarCount = 10 + Math.floor(seededRandom() * 5);
    
    for (let i = 0; i < brightStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star bright';
      
      // Random position across entire screen
      const top = seededRandom() * 100;
      const left = seededRandom() * 100;
      
      // Larger size (2px - 4px)
      const size = 2 + seededRandom() * 2;
      
      // High brightness
      const brightness = 0.8 + seededRandom() * 0.2;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      const duration = 4 + seededRandom() * 3;
      
      // Apply styles
      star.style.top = \`\${top}%\`;
      star.style.left = \`\${left}%\`;
      star.style.width = \`\${size}px\`;
      star.style.height = \`\${size}px\`;
      star.style.opacity = brightness.toString();
      star.style.animationDelay = \`\${delay}s\`;
      star.style.animationDuration = \`\${duration}s\`;
      star.style.boxShadow = \`0 0 \${Math.floor(size * 2)}px \${Math.floor(size)}px rgba(255, 255, 255, 0.8)\`;
      
      randomStars.appendChild(star);
    }
    
    return randomStars;
  }
  
  // Force animation restart by briefly pausing and resuming
  setTimeout(function() {
    document.documentElement.style.setProperty('--animation-play-state', 'paused');
    setTimeout(function() {
      document.documentElement.style.setProperty('--animation-play-state', 'running');
    }, 50);
  }, 100);
  
  // Check if animation elements exist, if not, create them
  const body = document.body;
  
  // Create the cosmic animation container if it doesn't exist
  let cosmicContainer = document.querySelector('.cosmic-animation-container');
  if (!cosmicContainer) {
    cosmicContainer = document.createElement('div');
    cosmicContainer.className = 'cosmic-animation-container';
    
    // Create the messages background if it doesn't exist
    let messagesBackground = document.querySelector('.messages-background');
    if (!messagesBackground) {
      messagesBackground = document.createElement('div');
      messagesBackground.className = 'messages-background';
      body.prepend(messagesBackground);
    }
    
    // Add the cosmic container to the messages background
    messagesBackground.appendChild(cosmicContainer);
    
    // Add random stars to the cosmic container
    const randomStars = generateRandomStars();
    cosmicContainer.appendChild(randomStars);
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
