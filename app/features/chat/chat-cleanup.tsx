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
          // In the updated design, we have a single button that changes state rather than separate buttons
          // Check for buttons with data-state="stop"
          const stuckButton = input.querySelector('button[data-state="stop"]') as HTMLButtonElement;
          
          if (stuckButton) {
            // See if this stop button has been displayed for too long (check class names or other indicators)
            const textarea = input.querySelector('textarea[name="message"]');
            
            // Only force click if textarea is editable and not disabled - this suggests a stuck state
            if (textarea && !textarea.hasAttribute('disabled')) {
              console.log('[ChatCleanup] Found button in stop state with editable textarea - fixing stuck loading state');
              stuckButton.click();
            }
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
            pointer-events: auto !important;
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
      
      // Also check for stuck buttons - buttons in stop state that have been shown for too long
      document.querySelectorAll('button[data-state="stop"]').forEach(button => {
        // Add logic here to determine if a button has been stuck in stop state
        // For example, you could use a data attribute to track when it entered stop state
        
        // This is a simple heuristic - if there's a stop button visible and text is editable,
        // it might be stuck
        const input = button.closest('.enhanced-input');
        if (input) {
          const textarea = input.querySelector('textarea[name="message"]');
          if (textarea && !textarea.hasAttribute('disabled')) {
            console.log('[ChatCleanup] Detected button stuck in stop state');
            cleanup();
          }
        }
      });
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
    
    // Reset any buttons stuck in stop state
    document.querySelectorAll('button[data-state="stop"]').forEach(button => {
      // When changing paths, always force reset stop buttons
      console.log('[ChatCleanup] Resetting button in stop state after path change');
      (button as HTMLButtonElement).click();
    });
  }, [pathname]);
  
  // Render nothing visible
  return null;
}

export default ChatCleanup; 