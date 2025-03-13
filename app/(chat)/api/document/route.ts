import { getServerSession } from '@/lib/auth';
import type { ArtifactKind } from '@/components/artifact';
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

// Helper function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Validate UUID format
  if (!isValidUUID(id)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid document ID format. Expected a valid UUID.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await getServerSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new Response('Not Found', { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Handle special case for "new" - generate a proper UUID
  const documentId = id === "new" ? generateUUID() : id;
  
  // For regular IDs, validate UUID format
  if (id !== "new" && !isValidUUID(id)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid document ID format. Expected a valid UUID.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await getServerSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
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

    return Response.json(document, { status: 200 });
  }
  return new Response('Unauthorized', { status: 401 });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { timestamp }: { timestamp: string } = await request.json();

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  // Validate UUID format
  if (!isValidUUID(id)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid document ID format. Expected a valid UUID.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await getServerSession();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (document.userId !== session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return new Response('Deleted', { status: 200 });
}


