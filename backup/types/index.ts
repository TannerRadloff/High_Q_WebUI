import type { Attachment as BaseAttachment } from 'ai';

// Extend the Attachment type to include textContent
export interface ExtendedAttachment extends BaseAttachment {
  textContent?: string;
}

export * from './artifact'; 