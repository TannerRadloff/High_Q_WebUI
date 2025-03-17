'use client';

import React from 'react';
import { LoaderIcon } from '@/app/features/icons/icons';

interface VersionFooterProps {
  version?: string;
  isLoading?: boolean;
  onVersionChange?: (version: string) => void;
  versions?: string[];
}

export function VersionFooter({
  version = 'latest',
  isLoading = false,
  onVersionChange,
  versions = []
}: VersionFooterProps) {
  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onVersionChange?.(e.target.value);
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t">
      <div className="flex items-center gap-2">
        {isLoading && <LoaderIcon size={14} className="animate-spin" />}
        <span>Version:</span>
        {versions.length > 1 ? (
          <select
            value={version}
            onChange={handleVersionChange}
            className="bg-transparent text-xs border-none focus:outline-none focus:ring-0"
          >
            {versions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <span>{version}</span>
        )}
      </div>
    </div>
  );
} 