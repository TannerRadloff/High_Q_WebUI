import type { Attachment as BaseAttachment } from 'ai';

/**
 * Extended Attachment type that includes text content for PDF and TXT files
 */
export interface ExtendedAttachment extends BaseAttachment {
  textContent?: string;
} 