/**
 * Utility function for combining class names with Tailwind
 * 
 * Example usage: cn('px-2', 'py-1', isActive && 'bg-blue-500')
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
