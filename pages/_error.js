import { useEffect } from 'react'

function Error({ statusCode, err }) {
  useEffect(() => {
    // Log any JS loading errors to help with debugging
    console.error('Error page rendered:', { 
      statusCode,
      hasError: !!err,
      errorMessage: err?.message,
      url: typeof window !== 'undefined' ? window.location.href : null
    })
  }, [statusCode, err])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-md dark:bg-zinc-800 dark:shadow-zinc-900/30">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
            {statusCode
              ? `Error ${statusCode}`
              : 'Client-side Error'}
          </h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            {statusCode
              ? 'An error occurred on the server'
              : 'An error occurred in your browser'}
          </p>
          
          {process.env.NODE_ENV !== 'production' && err?.message && (
            <div className="mt-6 rounded bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-300">{err.message}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-center space-x-4 pt-4">
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Reload Page
          </button>
          <button
            onClick={() => {
              // Clear cache by forcing a hard reload
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => {
                    caches.delete(name);
                  });
                });
              }
              window.location.reload(true);
            }}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode, err }
}

export default Error 