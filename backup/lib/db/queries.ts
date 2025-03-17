import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  passwordReset,
  type PasswordReset,
} from './schema';

// Create a database connection
let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Initialize database connection
function getDbConnection() {
  if (dbInstance) return dbInstance;
  
  if (!process.env.POSTGRES_URL) {
    console.error('Database connection error: POSTGRES_URL environment variable is not set.');
    throw new Error('POSTGRES_URL environment variable is not set.');
  }
  
  try {
    console.log('Initializing database connection to Vercel Postgres...');
    
    // Configure postgres with connection options optimized for Vercel Postgres
    client = postgres(process.env.POSTGRES_URL, {
      max: 10, // Maximum number of connections
      idle_timeout: 20, // Idle connection timeout in seconds
      connect_timeout: 10, // Connection timeout in seconds
      max_lifetime: 60 * 30, // Connection max lifetime in seconds (30 minutes)
      ssl: process.env.NODE_ENV === 'production', // Enable SSL in production
    });
    
    dbInstance = drizzle(client);
    console.log('Database connection to Vercel Postgres initialized successfully');
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database connection to Vercel Postgres:', error);
    throw error;
  }
}

// Helper to ensure we have a database connection
async function ensureDbConnection() {
  if (!dbInstance) {
    console.log('Database connection not initialized, creating new connection');
    
    // Add retry logic for connection
    let retries = 3;
    let connected = false;
    let lastError;
    
    while (retries > 0 && !connected) {
      try {
        getDbConnection();
        if (!dbInstance) {
          throw new Error('Database connection could not be established');
        }
        connected = true;
        console.log('Database connection successfully established');
      } catch (error) {
        lastError = error;
        console.error(`Error establishing database connection (attempt ${4-retries}/3):`, error);
        retries--;
        
        // Wait before retrying with exponential backoff
        if (retries > 0) {
          const backoffTime = Math.pow(2, 3-retries) * 100; // 100ms, 200ms, 400ms
          console.log(`Retrying database connection in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    if (!connected) {
      // Enhanced error message for better diagnosis
      const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
      const connectionError = new Error(`Failed to connect to database after 3 attempts: ${errorMessage}`);
      
      // Add additional debugging info
      if (lastError instanceof Error && lastError.stack) {
        connectionError.stack = lastError.stack;
      }
      
      throw connectionError;
    }
  }
  return dbInstance!;
}

export async function getUser(email: string): Promise<Array<User>> {
  try {
    const db = await ensureDbConnection();
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const db = await ensureDbConnection();
    const [selectedUser] = await db.select().from(user).where(eq(user.email, email));
    return selectedUser;
  } catch (error) {
    console.error('Failed to get user by email from database:', error);
    throw error;
  }
}

export async function createOAuthUser(
  email: string, 
  name: string | null | undefined, 
  image: string | null | undefined,
  provider: string
) {
  try {
    const db = await ensureDbConnection();
    return await db.insert(user).values({ 
      email, 
      name: name || null,
      image: image || null,
      provider,
      emailVerified: new Date()
    });
  } catch (error) {
    console.error('Failed to create OAuth user in database:', error);
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    const db = await ensureDbConnection();
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database:', error);
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    const db = await ensureDbConnection();
    
    // Validate inputs
    if (!id) throw new Error('Chat ID is required');
    if (!userId) throw new Error('User ID is required');
    
    console.log(`[DB] Saving chat with ID: ${id} for user: ${userId}`);
    
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database:', error);
    
    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for common database errors
    if (errorMessage.includes('duplicate key')) {
      throw new Error(`Chat with ID ${id} already exists`);
    }
    
    // Re-throw with more context
    throw new Error(`Failed to save chat: ${errorMessage}`);
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    const db = await ensureDbConnection();
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    console.log(`Database: Fetching chats for user ${id.substring(0, 5)}...`);
    const db = await ensureDbConnection();
    const chats = await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
    
    console.log(`Database: Successfully fetched ${chats.length} chats for user ${id.substring(0, 5)}...`);
    return chats;
  } catch (error) {
    console.error(`Database: Failed to get chats for user ${id.substring(0, 5)}...`, error);
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const db = await ensureDbConnection();
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    const db = await ensureDbConnection();
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const db = await ensureDbConnection();
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const db = await ensureDbConnection();
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const db = await ensureDbConnection();
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database:', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  content: string;
  userId: string;
}) {
  try {
    const db = await ensureDbConnection();
    
    // Validate inputs
    if (!id) throw new Error('Document ID is required');
    if (!userId) throw new Error('User ID is required');
    if (!['text', 'code', 'image', 'sheet'].includes(kind)) {
      throw new Error(`Invalid document kind: ${kind}. Must be one of: text, code, image, sheet`);
    }
    
    console.log(`[DB] Saving document with ID: ${id}, kind: ${kind} for user: ${userId}`);
    
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database:', error);
    
    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for common database errors
    if (errorMessage.includes('duplicate key')) {
      throw new Error(`Document with ID ${id} already exists`);
    }
    
    // Re-throw with more context
    throw new Error(`Failed to save document: ${errorMessage}`);
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const db = await ensureDbConnection();
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const db = await ensureDbConnection();
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const db = await ensureDbConnection();
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    const db = await ensureDbConnection();
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const db = await ensureDbConnection();
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const db = await ensureDbConnection();
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const db = await ensureDbConnection();
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    const db = await ensureDbConnection();
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

// Password reset functions
export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
  try {
    const db = await ensureDbConnection();
    return await db.insert(passwordReset).values({
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
      used: false,
    });
  } catch (error) {
    console.error('Failed to create password reset token in database');
    throw error;
  }
}

export async function getPasswordResetByToken(token: string): Promise<PasswordReset | undefined> {
  try {
    const db = await ensureDbConnection();
    const [resetToken] = await db
      .select()
      .from(passwordReset)
      .where(eq(passwordReset.token, token));
    
    return resetToken;
  } catch (error) {
    console.error('Failed to get password reset token from database');
    throw error;
  }
}

export async function markPasswordResetTokenAsUsed(id: string) {
  try {
    const db = await ensureDbConnection();
    return await db
      .update(passwordReset)
      .set({ used: true })
      .where(eq(passwordReset.id, id));
  } catch (error) {
    console.error('Failed to mark password reset token as used in database');
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  try {
    const db = await ensureDbConnection();
    const [selectedUser] = await db.select().from(user).where(eq(user.id, id));
    return selectedUser;
  } catch (error) {
    console.error('Failed to get user by id from database');
    throw error;
  }
}

export async function updateUserPassword(userId: string, hashedPassword: string) {
  try {
    const db = await ensureDbConnection();
    return await db
      .update(user)
      .set({ password: hashedPassword })
      .where(eq(user.id, userId));
  } catch (error) {
    console.error('Failed to update user password in database');
    throw error;
  }
}
