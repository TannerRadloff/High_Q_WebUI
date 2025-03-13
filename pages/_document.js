import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Force script loads to have proper Content-Type */}
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        {/* Preconnect to key domains */}
        <link rel="preconnect" href="https://mqwfrlkcrouhwhiumbzg.supabase.co" />
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* Add fallback error handling for script loading */}
        <script dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('error', function(e) {
              // Check if this is a script loading error
              if (e.target && (e.target.nodeName === 'SCRIPT')) {
                console.error('Script loading error:', e.target.src);
                
                // Only reload if this is a bundled JS file with a syntax error
                if (e.target.src.includes('.js') && 
                    e.message && 
                    e.message.includes('Unexpected token')) {
                  console.warn('Detected JS loading error, will attempt to reload page');
                  // Add a slight delay to avoid immediate reload loop
                  setTimeout(() => {
                    window.location.reload(true);
                  }, 2000);
                }
              }
            }, true);
          `
        }} />
      </body>
    </Html>
  )
} 