'use client';

import React from 'react';
import { 
  Copy, 
  FileText, 
  Image as ImageIcon, 
  Loader2 as LoaderIcon, 
  ThumbsDown as ThumbDownIcon, 
  ThumbsUp as ThumbUpIcon, 
  Maximize as FullscreenIcon 
} from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

export const Icon = ({ className, size = 16 }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    />
  );
};

export { 
  Copy as CopyIcon, 
  FileText as FileIcon, 
  ImageIcon, 
  LoaderIcon, 
  ThumbDownIcon, 
  ThumbUpIcon, 
  FullscreenIcon 
}; 