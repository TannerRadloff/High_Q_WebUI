import pdfParse from 'pdf-parse';

/**
 * Extracts text content from a file based on its MIME type
 * @param file The file to extract content from
 * @param contentType The MIME type of the file
 * @returns The extracted text content
 */
export async function extractFileContent(
  file: Blob,
  contentType: string
): Promise<string | null> {
  try {
    // For text files, simply read as text
    if (contentType === 'text/plain') {
      return await file.text();
    }
    
    // For PDF files, use pdf-parse to extract text
    if (contentType === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      const pdfData = await pdfParse(Buffer.from(buffer));
      return pdfData.text;
    }
    
    // For other file types, return null
    return null;
  } catch (error) {
    console.error('Error extracting file content:', error);
    return null;
  }
}

/**
 * Truncates text to a maximum length, adding an ellipsis if truncated
 * @param text The text to truncate
 * @param maxLength The maximum length of the text
 * @returns The truncated text
 */
export function truncateText(text: string, maxLength: number = 4000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
} 