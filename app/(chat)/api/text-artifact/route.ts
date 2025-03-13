import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
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
  const session = await getServerSession();

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

    console.log('Creating text artifact:', { 
      id: documentId, 
      title, 
      contentLength: textContent.length,
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

