'use client'

import { useEffect } from 'react'
import { Button } from '@/app/features/button/button'
import Link from 'next/link'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to the console for debugging
    console.error('Error boundary caught an error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Something went wrong
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <div className="rounded bg-zinc-100 dark:bg-zinc-800 p-2 mt-4">
              <code className="text-sm text-zinc-700 dark:text-zinc-300">Error ID: {error.digest}</code>
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-4 pt-6">
          <Button 
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition duration-150"
          >
            Try again
          </Button>
          <Link href="/" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
            Return to home page
          </Link>
        </div>
        
        {process.env.NODE_ENV === 'development' && error.stack && (
          <div className="mt-8 rounded-md bg-red-50 dark:bg-red-900/20 p-4 overflow-auto text-left">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Stack trace:</p>
            <pre className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap break-all">
              {error.stack}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
} 

