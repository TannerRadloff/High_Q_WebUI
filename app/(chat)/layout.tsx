import { cookies } from 'next/headers';
import { getServerSession } from '@/lib/auth';
import Script from 'next/script';

export const experimental_ppr = true;

// Minimal script for error handling - animations removed
const MINIMAL_SCRIPT = `\
(function() {
  function initErrorHandling() {
    try {
      // Wait for DOM to be fully loaded
      if (document.readyState !== 'complete') {
        window.addEventListener('load', initErrorHandling);
        return;
      }
      
      // Set up error handling for the error overlay
      const errorOverlay = document.getElementById('error-recovery-overlay');
      if (errorOverlay) {
        // Get title and message elements
        const errorTitle = document.getElementById('error-title');
        const errorMessage = document.getElementById('error-message');
        const loginButton = document.getElementById('login-button');
        const retryButton = document.getElementById('retry-button');
        
        // Set up retry button behavior
        if (retryButton) {
          retryButton.addEventListener('click', function() {
            window.location.reload();
          });
        }
        
        // Set up login button behavior if it exists
        if (loginButton) {
          loginButton.addEventListener('click', function() {
            window.location.href = '/login';
          });
        }
        
        // Show the overlay on history error with correct message
        document.addEventListener('historyLoadError', function(e) {
          const detail = e.detail || {};
          const errorType = detail.type || 'loading-error';
          
          // Update UI based on error type
          if (errorType === 'authentication-required') {
            if (errorTitle) errorTitle.textContent = 'Authentication Required';
            if (errorMessage) errorMessage.textContent = 'Please sign in to access this feature.';
            
            // Show login button, hide retry button
            if (loginButton) loginButton.style.display = 'block';
            if (retryButton) retryButton.style.display = 'none';
          } else {
            // Default to connection issue
            if (errorTitle) errorTitle.textContent = 'Connection Issue';
            if (errorMessage) errorMessage.textContent = 'We\'re having trouble loading your chat history. This could be due to a temporary network issue.';
            
            // Show retry button, hide login button
            if (loginButton) loginButton.style.display = 'none';
            if (retryButton) retryButton.style.display = 'block';
          }
          
          errorOverlay.classList.add('visible');
        });
        
        // Add a method to dismiss the overlay
        window.dismissErrorOverlay = function() {
          errorOverlay.classList.remove('visible');
        };
      }
    } catch (e) {
      console.error('Error initializing error handling:', e);
    }
  }

  // Initialize error handling when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initErrorHandling);
  } else {
    // Small delay to ensure React has rendered
    setTimeout(initErrorHandling, 100);
  }
})();`;

// Extend Window interface to include our custom functions
declare global {
  interface Window {
    dismissErrorOverlay?: () => void;
  }
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get server session - no need to get or set sidebar collapse state here
  const session = await getServerSession();

  return (
    <div className="relative w-full h-full">
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: MINIMAL_SCRIPT,
        }}
      />
      {children}
      
      {/* Enhanced error recovery overlay - supports authentication and network errors */}
      <div id="error-recovery-overlay" className="hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 id="error-title" className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Connection Issue
          </h2>
          <p id="error-message" className="mb-4 text-muted-foreground">
            We're having trouble loading your chat history. This could be due to a temporary network issue.
          </p>
          <div className="flex justify-end gap-2">
            <button 
              id="login-button"
              style={{ display: 'none' }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Sign in to continue"
            >
              Sign In
            </button>
            <button 
              id="retry-button"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Retry loading chat history"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


