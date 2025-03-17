import { getSupabaseClient } from './database';
import { generateUUID } from '@/utils/auth';

export type Chat = {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  visibility?: 'private' | 'public';
};

export type Message = {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'data';
  content: string;
  chatId: string;
  createdAt: Date;
  documentId?: string;
  artifactTitle?: string;
  data?: any;
  reasoning?: string;
  experimental_attachments?: any[];
  annotations?: any[];
  toolInvocations?: any[];
  parts?: any[];
};

// Chat operations
export async function getChatById({ id }: { id: string }) {
  try {
    console.log(`[Supabase] Getting chat with ID: ${id}`);
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('[Supabase] Error fetching chat:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase] Failed to get chat by ID:', error);
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility = 'private'
}: {
  id: string;
  userId: string;
  title: string;
  visibility?: 'private' | 'public';
}) {
  try {
    console.log(`[Supabase] Saving chat with ID: ${id} for user: ${userId}`);
    
    // Validate inputs
    if (!id) throw new Error('Chat ID is required');
    if (!userId) throw new Error('User ID is required');
    
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('chat')
      .insert({
        id,
        user_id: userId,
        title,
        created_at: new Date().toISOString(),
        visibility
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Supabase] Error saving chat:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase] Failed to save chat:', error);
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  const traceId = generateTraceId();
  try {
    console.log(`[Supabase][${traceId}] Fetching chats for user: ${id.substring(0, 5)}...`);
    
    // Performance tracking
    const startTime = performance.now();
    
    const supabase = await getSupabaseClient();
    console.log(`[Supabase][${traceId}] Client initialized successfully for getChatsByUserId`);
    
    // Log database connection attempt
    console.log(`[Supabase][${traceId}] Sending query to database...`);
    
    // Add query timeout and diagnostics
    let queryTimedOut = false;
    const timeoutId = setTimeout(() => {
      queryTimedOut = true;
      console.error(`[Supabase][${traceId}] Query timeout warning: getChatsByUserId has been running for 4s`);
    }, 4000);
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    
    // Clear the timeout since the query has completed
    clearTimeout(timeoutId);
    
    // Performance logging
    const duration = performance.now() - startTime;
    console.log(`[Supabase][${traceId}] Query execution time: ${duration.toFixed(2)}ms`);
    
    if (error) {
      console.error(`[Supabase][${traceId}] Error fetching user chats:`, {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        queryTimedOut,
        userId: id.substring(0, 5),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    // Log the result summary
    console.log(`[Supabase][${traceId}] Successfully fetched ${data?.length || 0} chats for user ${id.substring(0, 5)}`);
    
    if (data) {
      // Perform basic data validation
      const validData = data.every(chat => 
        typeof chat.id === 'string' && 
        typeof chat.title === 'string' && 
        typeof chat.user_id === 'string'
      );
      
      if (!validData) {
        console.warn(`[Supabase][${traceId}] Data validation warning: Some chat records have unexpected format`);
      }
      
      // Check for empty data
      if (data.length === 0) {
        console.log(`[Supabase][${traceId}] Note: No chat records found for user ${id.substring(0, 5)}`);
      }
    }
    
    return data || [];
  } catch (error) {
    console.error(`[Supabase][${traceId}] Failed to get chats by user ID:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n')[0]
      } : String(error),
      userId: id.substring(0, 5),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Helper function to generate a trace ID for correlating logs
function generateTraceId() {
  return Math.random().toString(36).substring(2, 10);
}

// Message operations
export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    console.log(`[Supabase] Saving ${messages.length} messages`);
    
    const formattedMessages = messages.map(msg => ({
      id: msg.id || generateUUID(),
      role: msg.role,
      content: msg.content,
      chat_id: msg.chatId,
      created_at: msg.createdAt.toISOString(),
      document_id: msg.documentId,
      artifact_title: msg.artifactTitle
    }));
    
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('message')
      .insert(formattedMessages)
      .select();
    
    if (error) {
      console.error('[Supabase] Error saving messages:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase] Failed to save messages:', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    console.log(`[Supabase] Fetching messages for chat: ${id}`);
    
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('message')
      .select('*')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[Supabase] Error fetching chat messages:', error);
      throw error;
    }
    
    // Transform database column names to camelCase for consistency
    return data.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      chatId: msg.chat_id,
      createdAt: new Date(msg.created_at),
      documentId: msg.document_id,
      artifactTitle: msg.artifact_title
    }));
  } catch (error) {
    console.error('[Supabase] Failed to fetch messages by chat ID:', error);
    throw error;
  }
}

// Votes operations
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
    console.log(`[Supabase] Voting for message: ${messageId} in chat: ${chatId} with type: ${type}`);
    
    const supabase = await getSupabaseClient();
    // Check if vote already exists
    const { data: existingVote, error: checkError } = await supabase
      .from('vote')
      .select('*')
      .eq('message_id', messageId)
      .eq('chat_id', chatId)
      .maybeSingle();
    
    if (checkError) {
      console.error('[Supabase] Error checking existing vote:', checkError);
      throw checkError;
    }
    
    if (existingVote) {
      // Update existing vote
      const { data, error } = await supabase
        .from('vote')
        .update({ is_upvoted: type === 'up' })
        .eq('id', existingVote.id)
        .select()
        .single();
      
      if (error) {
        console.error('[Supabase] Error updating vote:', error);
        throw error;
      }
      
      return data;
    } else {
      // Create new vote
      const { data, error } = await supabase
        .from('vote')
        .insert({
          chat_id: chatId,
          message_id: messageId,
          is_upvoted: type === 'up',
        })
        .select()
        .single();
      
      if (error) {
        console.error('[Supabase] Error creating vote:', error);
        throw error;
      }
      
      return data;
    }
  } catch (error) {
    console.error('[Supabase] Failed to vote message:', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    console.log(`[Supabase] Fetching votes for chat: ${id}`);
    
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('vote')
      .select('*')
      .eq('chat_id', id);
    
    if (error) {
      console.error('[Supabase] Error fetching votes:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase] Failed to get votes by chat ID:', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    console.log(`[Supabase] Deleting chat with ID: ${id}`);

    const supabase = await getSupabaseClient();
    // First delete all related votes
    const { error: voteError } = await supabase
      .from('vote')
      .delete()
      .eq('chat_id', id);

    if (voteError) {
      console.error('[Supabase] Error deleting votes:', voteError);
      throw voteError;
    }

    // Then delete all related messages
    const { error: messageError } = await supabase
      .from('message')
      .delete()
      .eq('chat_id', id);

    if (messageError) {
      console.error('[Supabase] Error deleting messages:', messageError);
      throw messageError;
    }

    // Finally delete the chat
    const { error: chatError } = await supabase
      .from('chat')
      .delete()
      .eq('id', id);

    if (chatError) {
      console.error('[Supabase] Error deleting chat:', chatError);
      throw chatError;
    }

    return { success: true };
  } catch (error) {
    console.error('[Supabase] Failed to delete chat by ID:', error);
    throw error;
  }
}

// Document operations
export async function saveDocument({
  id,
  content,
  kind,
  title,
  userId
}: {
  id: string;
  content: string;
  kind: string;
  title?: string;
  userId?: string;
}) {
  try {
    console.log(`[Supabase] Saving document with ID: ${id}`);
    
    // Validate inputs
    if (!id) throw new Error('Document ID is required');
    if (!content) throw new Error('Content is required');
    if (!kind) throw new Error('Kind is required');
    
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('document')
      .insert({
        id,
        content,
        kind,
        title,
        user_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Supabase] Error saving document:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase] Failed to save document:', error);
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    console.log(`[Supabase] Getting document with ID: ${id}`);
    
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('document')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('[Supabase] Error fetching document:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase] Failed to get document by ID:', error);
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    console.log(`[Supabase] Deleting document with ID: ${id} after ${timestamp.toISOString()}`);
    
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from('document')
      .delete()
      .eq('id', id)
      .gt('created_at', timestamp.toISOString());
    
    if (error) {
      console.error('[Supabase] Error deleting document:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Supabase] Failed to delete document by ID after timestamp:', error);
    throw error;
  }
} 