/**
 * This component helps clean up any stuck states in the chat UI
 */
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Renders a cleanup component that resets UI states when navigating away from chat
 */
export function ChatCleanup() {
  const pathname = usePathname();
  
  // Run cleanup immediately when component mounts
  useEffect(() => {
    // Force cleanup of disabled inputs
    const cleanup = () => {
      console.log('[ChatCleanup] Running cleanup...');
      
      // Remove disabled attribute from textarea elements
      const fixDisabledElements = () => {
        const disabledTextareas = document.querySelectorAll('textarea[disabled]');
        if (disabledTextareas.length > 0) {
          console.log(`[ChatCleanup] Found ${disabledTextareas.length} disabled textareas`);
          disabledTextareas.forEach(textarea => {
            console.log('[ChatCleanup] Enabling disabled textarea');
            textarea.removeAttribute('disabled');
          });
        }
        
        // Fix any stuck loading states
        document.querySelectorAll('.enhanced-input').forEach(input => {
          // Find send button in the enhanced-input
          const stopButtons = input.querySelectorAll('button[aria-label="Stop generation"]');
          const sendButtons = input.querySelectorAll('button[aria-label="Send message"]');
          
          if (stopButtons.length > 0 && sendButtons.length === 0) {
            console.log('[ChatCleanup] Found stop button without send button - fixing stuck loading state');
            
            // Create a click event on the stop button
            const stopButton = stopButtons[0] as HTMLButtonElement;
            stopButton.click();
          }
        });
      };
      
      // Apply global fixes
      const applyGlobalFixes = () => {
        // Create a style element to force override pointer-events
        const style = document.createElement('style');
        style.innerHTML = `
          textarea[name="message"] {
            opacity: 1 !important;
            cursor: text !important;
            pointer-events: auto !important;
            user-select: text !important;
          }
          .enhanced-input button {
            opacity: 1 !important;
            visibility: visible !important;
            display: flex !important;
          }
        `;
        document.head.appendChild(style);
        
        return style;
      };
      
      // Apply fixes
      fixDisabledElements();
      const styleElement = applyGlobalFixes();
      
      // Check again after a short delay (wait for any in-progress rendering)
      setTimeout(() => {
        fixDisabledElements();
      }, 1000);
      
      // Check again after a longer delay (wait for any async operations)
      setTimeout(() => {
        fixDisabledElements();
        document.head.removeChild(styleElement);
      }, 5000);
    };
    
    // Run cleanup immediately
    cleanup();
    
    // Set up a periodic check to detect and fix issues
    const intervalId = setInterval(() => {
      const disabledTextareas = document.querySelectorAll('textarea[disabled]');
      if (disabledTextareas.length > 0) {
        console.log('[ChatCleanup] Detected disabled textarea in periodic check');
        cleanup();
      }
    }, 3000);
    
    // Clean up interval when component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // Respond to path changes
  useEffect(() => {
    console.log('[ChatCleanup] Path changed, running cleanup');
    
    // Find disabled textareas and force enable them
    const disabledTextareas = document.querySelectorAll('textarea[disabled]');
    disabledTextareas.forEach(textarea => {
      console.log('[ChatCleanup] Enabling disabled textarea after path change');
      textarea.removeAttribute('disabled');
    });
  }, [pathname]);
  
  // Render nothing visible
  return null;
}

export default ChatCleanup; 