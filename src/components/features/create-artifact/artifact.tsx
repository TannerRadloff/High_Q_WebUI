'use client';

import React from 'react';

interface ArtifactProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Artifact({ children, className = '', title }: ArtifactProps) {
  return (
    <div className={`artifact-container ${className}`}>
      {title && <h3 className="artifact-title">{title}</h3>}
      <div className="artifact-content">
        {children}
      </div>
    </div>
  );
} 