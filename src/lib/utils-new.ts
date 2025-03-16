import { cn } from '@/lib/utils';

export const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Re-export cn for backward compatibility
export { cn }; 