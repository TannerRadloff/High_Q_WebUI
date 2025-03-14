import { cookies } from 'next/headers';

import { AppSidebar } from '@/src/components/layout/app-sidebar';
import { SidebarInset } from '@/components/ui/sidebar';

import { getServerSession } from '@/lib/auth';
import Script from 'next/script';

export const experimental_ppr = true;

// Script to ensure animations are properly initialized
const ANIMATION_INIT_SCRIPT = `\
(function() {
  // Set animation variables
  document.documentElement.style.setProperty('--animation-play-state', 'running');
  document.documentElement.style.setProperty('--animation-opacity', '1');
  document.documentElement.style.setProperty('--nebula-opacity', '0.9');
  document.documentElement.style.setProperty('--stars-opacity', '1');
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
    
    // Dense cluster region (120-180 stars) - increased from 80-120
    const clusterStarCount = 120 + Math.floor(seededRandom() * 60);
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
      
      // Random size (0.5px - 3.5px) - increased max size
      const size = 0.5 + seededRandom() * 3;
      
      // Random brightness
      const brightness = 0.5 + seededRandom() * 0.5;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      // Shorter duration for more noticeable twinkling (1.5-3.5s)
      const duration = 1.5 + seededRandom() * 2;
      
      // Apply styles
      star.style.top = \`\${top}%\`;
      star.style.left = \`\${left}%\`;
      star.style.width = \`\${size}px\`;
      star.style.height = \`\${size}px\`;
      star.style.opacity = brightness.toString();
      star.style.setProperty('--original-opacity', brightness.toString());
      star.style.animationDelay = \`\${delay}s\`;
      star.style.animationDuration = \`\${duration}s\`;
      
      randomStars.appendChild(star);
    }
    
    // Scattered stars throughout (100-150 stars) - increased from 70-100
    const scatteredStarCount = 100 + Math.floor(seededRandom() * 50);
    
    for (let i = 0; i < scatteredStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star';
      
      // Random position across entire screen
      const top = seededRandom() * 100;
      const left = seededRandom() * 100;
      
      // Random size (0.5px - 2.5px) - increased max size
      const size = 0.5 + seededRandom() * 2;
      
      // Random brightness
      const brightness = 0.4 + seededRandom() * 0.6;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      // Shorter duration for more noticeable twinkling (1.5-3.5s)
      const duration = 1.5 + seededRandom() * 2;
      
      // Apply styles
      star.style.top = \`\${top}%\`;
      star.style.left = \`\${left}%\`;
      star.style.width = \`\${size}px\`;
      star.style.height = \`\${size}px\`;
      star.style.opacity = brightness.toString();
      star.style.setProperty('--original-opacity', brightness.toString());
      star.style.animationDelay = \`\${delay}s\`;
      star.style.animationDuration = \`\${duration}s\`;
      
      randomStars.appendChild(star);
    }
    
    // Bright highlight stars (25-40 stars) - increased from 15-25
    const brightStarCount = 25 + Math.floor(seededRandom() * 15);
    
    for (let i = 0; i < brightStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star bright';
      
      // Random position across entire screen
      const top = seededRandom() * 100;
      const left = seededRandom() * 100;
      
      // Larger size (2px - 5px) - increased max size
      const size = 2 + seededRandom() * 3;
      
      // High brightness
      const brightness = 0.8 + seededRandom() * 0.2;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      // Shorter duration for more noticeable twinkling (2-4s)
      const duration = 2 + seededRandom() * 2;
      
      // Apply styles
      star.style.top = \`\${top}%\`;
      star.style.left = \`\${left}%\`;
      star.style.width = \`\${size}px\`;
      star.style.height = \`\${size}px\`;
      star.style.opacity = brightness.toString();
      star.style.setProperty('--original-opacity', brightness.toString());
      star.style.animationDelay = \`\${delay}s\`;
      star.style.animationDuration = \`\${duration}s\`;
      star.style.boxShadow = \`0 0 \${Math.floor(size * 3)}px \${Math.floor(size * 1.5)}px rgba(255, 255, 255, 0.8)\`;
      
      randomStars.appendChild(star);
    }
    
    // Add extra-bright stars (5-10 stars) - new category
    const extraBrightStarCount = 5 + Math.floor(seededRandom() * 5);
    
    for (let i = 0; i < extraBrightStarCount; i++) {
      const star = document.createElement('div');
      star.className = 'random-star extra-bright';
      
      // Random position across entire screen
      const top = seededRandom() * 100;
      const left = seededRandom() * 100;
      
      // Larger size (3px - 6px)
      const size = 3 + seededRandom() * 3;
      
      // Maximum brightness
      const brightness = 0.9 + seededRandom() * 0.1;
      
      // Random twinkle animation delay and duration
      const delay = seededRandom() * 10;
      // Shorter duration for more noticeable twinkling (1.5-3s)
      const duration = 1.5 + seededRandom() * 1.5;
      
      // Apply styles
      star.style.top = \`\${top}%\`;
      star.style.left = \`\${left}%\`;
      star.style.width = \`\${size}px\`;
      star.style.height = \`\${size}px\`;
      star.style.opacity = brightness.toString();
      star.style.setProperty('--original-opacity', brightness.toString());
      star.style.animationDelay = \`\${delay}s\`;
      star.style.animationDuration = \`\${duration}s\`;
      star.style.boxShadow = \`0 0 \${Math.floor(size * 4)}px \${Math.floor(size * 2)}px rgba(255, 255, 255, 0.9), 
                               0 0 \${Math.floor(size * 8)}px \${Math.floor(size * 4)}px rgba(255, 255, 255, 0.4)\`;
      
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
        {/* Animation elements are now created by the script if they don't exist */}
        {children}
      </SidebarInset>
    </div>
  );
}


