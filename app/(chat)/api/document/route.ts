import { getServerSession } from '@/lib/auth';
import type { ArtifactKind } from '@/src/types/artifact';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from '@/lib/supabase/queries';
import { generateUUID } from '@/lib/utils';
import { NextResponse } from 'next/server';

// Helper function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid document ID format. Expected a valid UUID.' },
      { status: 400 }
    );
  }

  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const document = await getDocumentsById({ id });

  if (!document) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  if (document.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(document, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Handle special case for "new" - generate a proper UUID
  const documentId = id === "new" ? generateUUID() : id;
  
  // For regular IDs, validate UUID format
  if (id !== "new" && !isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid document ID format. Expected a valid UUID.' },
      { status: 400 }
    );
  }

  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  if (session.user?.id) {
    const document = await saveDocument({
      id: documentId,
      content,
      title,
      kind,
      userId: session.user.id,
    });

    return NextResponse.json(document, { status: 200 });
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid document ID format. Expected a valid UUID.' },
      { status: 400 }
    );
  }

  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const document = await getDocumentsById({ id });

  if (!document) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  if (document.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return NextResponse.json({ message: 'Deleted' }, { status: 200 });
}


