export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="relative flex items-center justify-center">
        <div className="absolute animate-ping h-16 w-16 rounded-full bg-blue-400 opacity-75"></div>
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-blue-500">
          <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <h2 className="mt-4 text-xl font-medium text-zinc-700 dark:text-zinc-300">Loading...</h2>
    </div>
  )
} 