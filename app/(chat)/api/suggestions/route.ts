import { getServerSession } from '@/lib/auth';
import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

// Helper function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // Validate UUID format
  if (!isValidUUID(documentId)) {
    return NextResponse.json(
      { error: 'Invalid document ID format. Expected a valid UUID.' },
      { status: 400 }
    );
  }

  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return NextResponse.json([], { status: 200 });
  }

  if (suggestion.userId !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(suggestions, { status: 200 });
}


