'use client';

export function DocumentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-5/6"></div>
        <div className="h-4 bg-muted rounded w-4/6"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-3/6"></div>
      </div>
    </div>
  );
} 