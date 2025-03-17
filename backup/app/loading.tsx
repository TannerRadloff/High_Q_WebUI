export default function Loading() {
  return (
    <div className="flex-center-col min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="relative flex-center">
        <div className="absolute animate-ping size-16 rounded-full bg-blue-400 opacity-75"></div>
        <div className="relative flex-center size-12 rounded-full bg-blue-500">
          <svg className="size-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <h2 className="mt-4 text-xl font-medium text-zinc-700 dark:text-zinc-300">Loading...</h2>
    </div>
  )
} 

