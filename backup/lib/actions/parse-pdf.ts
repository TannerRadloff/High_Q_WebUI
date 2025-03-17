'use server';

import { parsePdf } from '../server/pdf-parser';

/**
 * Server action to parse PDF files
 * This should only be called from the server
 */
export async function parsePdfAction(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    return await parsePdf(fileBuffer);
  } catch (error) {
    console.error('Error in PDF parsing server action:', error);
    return '';
  }
} 