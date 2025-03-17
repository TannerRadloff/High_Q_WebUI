import type { Document } from '@/lib/db/schema';

/**
 * Get the timestamp of a document by its index
 */
export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
} 