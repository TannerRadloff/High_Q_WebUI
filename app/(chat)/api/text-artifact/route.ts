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

    // Save the document to the database
    await saveDocument({
      id: documentId,
      title,
      content: textContent,
      kind: 'text',
      userId: session.user.id,
    });

    // Return the document information
    return NextResponse.json({
      success: true,
      documentId,
      title,
    });
  } catch (error) {
    console.error('Error creating text artifact:', error);
    return NextResponse.json(
      { error: 'Failed to create text artifact' },
      { status: 500 }
    );
  }
} 