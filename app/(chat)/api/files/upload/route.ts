import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { parsePdf } from '@/lib/server/pdf-parser';
import { extractTextFromFile, identifyFileType } from '@/lib/utils';

// Maximum size for text content in characters to return in the response
const MAX_TEXT_CONTENT_SIZE = 15000;

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'].includes(file.type), {
      message: 'File type should be JPEG, PNG, PDF, or TXT',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();
    
    // Identify file type based on content and extension
    const detectedContentType = await identifyFileType(fileBuffer, filename, file.type);
    const contentType = detectedContentType || file.type;

    // Extract text content from PDF and TXT files
    let textContent = null;
    let isContentTruncated = false;
    
    if (contentType === 'text/plain') {
      textContent = await extractTextFromFile(fileBuffer, contentType);
      
      // Check if text content is too large and truncate if necessary
      if (textContent && textContent.length > MAX_TEXT_CONTENT_SIZE) {
        textContent = textContent.substring(0, MAX_TEXT_CONTENT_SIZE);
        isContentTruncated = true;
      }
    } else if (contentType === 'application/pdf') {
      // Direct server-side PDF parsing (since this is a server component)
      textContent = await parsePdf(fileBuffer);
      
      // Check if text content is too large and truncate if necessary
      if (textContent && textContent.length > MAX_TEXT_CONTENT_SIZE) {
        textContent = textContent.substring(0, MAX_TEXT_CONTENT_SIZE);
        isContentTruncated = true;
      }
    }

    try {
      const data = await put(`${filename}`, fileBuffer, {
        access: 'public',
        contentType: contentType,
      });

      // Include the extracted text content and detected content type in the response
      return NextResponse.json({
        ...data,
        contentType: contentType,
        textContent: isContentTruncated 
          ? `${textContent}... (content truncated due to size, full content will be processed)`
          : textContent,
      });
    } catch (error) {
      console.error('Error uploading to blob storage:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing file upload request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
