/**
 * Components Barrel File
 * 
 * This root barrel file organizes and re-exports all components from their respective categories.
 * Using this, you can import components with simplified paths:
 * 
 * // Before
 * import { Button } from '@/app/features/button/button';
 * 
 * // After
 * import { Button } from '@/src/components';
 */

// Export all component categories
export * from './common';
export * from './layout';
export * from './features';
export * from './ui';
export * from './auth'; 