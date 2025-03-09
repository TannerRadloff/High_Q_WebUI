import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { saveDocument } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

// Define a type for the system message with document
interface SystemMessageWithDocument {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: Date;
  documentId?: string;
  artifactTitle?: string;
  artifactKind?: string;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { chatId, fileUrl, fileName, textContent } = await request.json();

    if (!chatId || !fileUrl || !textContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a document ID for the text artifact
    const documentId = generateUUID();
    const title = fileName || 'Uploaded Text File';

    // Make sure content is a string and not empty
    if (!textContent || typeof textContent !== 'string') {
      console.error('Invalid text content:', typeof textContent);
      return NextResponse.json(
        { error: 'Invalid text content' },
        { status: 400 }
      );
    }

    // Log first part of content to verify it's valid
    const contentPreview = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
    console.log('Creating text artifact:', { 
      id: documentId, 
      title, 
      contentLength: textContent.length,
      contentPreview,
      userId: session.user.id 
    });

    // Save the document to the database
    try {
      await saveDocument({
        id: documentId,
        title,
        content: textContent,
        kind: 'text',
        userId: session.user.id,
      });
      
      console.log('Text artifact created successfully');
      
      // Verify the document was saved by trying to retrieve it
      try {
        const { getDocumentById } = await import('@/lib/db/queries');
        const savedDoc = await getDocumentById({ id: documentId });
        if (savedDoc) {
          console.log(`Verified document saved: ID ${documentId}, Content length: ${savedDoc.content?.length || 0}`);
        } else {
          console.error('Document was not found after saving!');
        }
      } catch (verifyError) {
        console.error('Error verifying document save:', verifyError);
      }
    } catch (saveError) {
      console.error('Error saving document:', saveError);
      throw saveError;
    }

    // Return the document information with complete details
    return NextResponse.json({
      success: true,
      documentId,
      title,
      kind: 'text',
      contentLength: textContent.length,
    });
  } catch (error) {
    console.error('Error creating text artifact:', error);
    return NextResponse.json(
      { error: 'Failed to create text artifact' },
      { status: 500 }
    );
  }
} 