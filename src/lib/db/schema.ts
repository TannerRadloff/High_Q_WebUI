// This is a simplified schema file for use by components
// It re-exports types from the main lib/db/schema.ts file

// Export the Vote type
export interface Vote {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
} 