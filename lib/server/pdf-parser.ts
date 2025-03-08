// This file should only be imported from server components or API routes
import { createRequire } from 'module';

// Dynamically import pdf-parse to ensure it's only loaded on the server
export async function parsePdf(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamically import pdf-parse only on the server
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');
    
    const pdfData = await pdfParse(Buffer.from(fileBuffer));
    return pdfData.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return '';
  }
} 