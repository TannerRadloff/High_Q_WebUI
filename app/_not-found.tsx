import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 bg-gradient-to-b from-black via-slate-900 to-slate-950">
      <div className="w-full max-w-md mx-auto p-6 bg-zinc-900/90 rounded-lg border border-zinc-800/30 shadow-xl">
        <h2 className="text-2xl text-primary font-semibold mb-4">Page Not Found</h2>
        <p className="text-white/80 mb-6">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors inline-block"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
} 