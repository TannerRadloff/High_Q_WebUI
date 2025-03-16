import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
// Import dynamically to avoid type issues
// @ts-ignore - Lucide React has type conflicts in this project
import { AlertCircle } from 'lucide-react'

interface RecoveryLinkProps {
  mode?: 'minimal' | 'full'
  className?: string
  onClose?: () => void
}

export default function RecoveryLink({
  mode = 'minimal',
  className = '',
  onClose
}: RecoveryLinkProps) {
  if (mode === 'minimal') {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <span className="text-muted-foreground">
          Having issues?{' '}
          <Link href="/auth-check" className="underline text-primary hover:text-primary/90">
            Fix authentication
          </Link>
        </span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-700">Authentication Issues Detected</h3>
          <div className="mt-2 text-sm text-yellow-600">
            <p>
              We've detected issues with your current session. This might cause problems
              accessing protected pages or API calls failing.
            </p>
            <div className="mt-3">
              <Link href="/auth-check" passHref>
                <Button
                  variant="outline"
                  className="border-yellow-300 bg-white text-yellow-700 hover:bg-yellow-50"
                >
                  Fix Authentication Issues
                </Button>
              </Link>
              {onClose && (
                <Button
                  variant="ghost"
                  className="ml-2 text-yellow-700 hover:bg-yellow-100"
                  onClick={onClose}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 