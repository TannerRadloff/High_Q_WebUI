import type {
  CoreAssistantMessage,
  CoreToolMessage,
  Message,
  ToolInvocation,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Message as DBMessage, Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map((toolInvocation) => {
          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === toolInvocation.toolCallId,
          );

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result,
            };
          }

          return toolInvocation;
        }),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<DBMessage>,
): Array<Message> {
  console.log(`[DEBUG] Converting ${messages.length} messages from DB to UI format`);
  
  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === 'tool') {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      });
    }

    let textContent = '';
    let reasoning: string | undefined = undefined;
    const toolInvocations: Array<ToolInvocation> = [];

    // Parse content if it's a JSON string
    let parsedContent = message.content;
    if (typeof message.content === 'string') {
      try {
        // Check if the string is actually a stringified JSON array
        if (message.content.startsWith('[') && message.content.endsWith(']')) {
          console.log(`[DEBUG] Parsing JSON string content for message ${message.id}`);
          parsedContent = JSON.parse(message.content);
        } else {
          // If it's not a JSON array, just use the string as is
          textContent = message.content;
        }
      } catch (e) {
        // If parsing fails, just use the string as is
        console.error(`[DEBUG] Failed to parse JSON content for message ${message.id}:`, e);
        textContent = message.content;
      }
    }

    // Process array content (either original array or parsed from JSON)
    if (Array.isArray(parsedContent)) {
      console.log(`[DEBUG] Processing array content for message ${message.id} with ${parsedContent.length} items`);
      for (const content of parsedContent) {
        if (content.type === 'text') {
          textContent += content.text;
        } else if (content.type === 'tool-call') {
          toolInvocations.push({
            state: 'call',
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            args: content.args,
          });
        } else if (content.type === 'reasoning') {
          console.log(`[DEBUG] Found reasoning in message ${message.id}`);
          reasoning = content.reasoning;
        }
      }
    }

    chatMessages.push({
      id: message.id,
      role: message.role as Message['role'],
      content: textContent,
      reasoning,
      toolInvocations,
    });

    return chatMessages;
  }, []);
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      if (Array.isArray(message.content)) {
        for (const content of message.content) {
          if (content.type === 'tool-result') {
            toolResultIds.push(content.toolCallId);
          }
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    // For assistant messages, ensure we handle the reasoning properly
    if (typeof message.content === 'string') {
      // If the content is a string and we have reasoning, convert to array format
      if (reasoning) {
        return {
          ...message,
          content: [
            { type: 'text', text: message.content },
            { type: 'reasoning', reasoning },
          ],
        };
      }
      return message;
    }

    if (Array.isArray(message.content)) {
      const sanitizedContent = message.content.filter((content) => {
        if (content.type === 'tool-call') {
          return toolResultIds.includes(content.toolCallId);
        }
        else if (content.type === 'text') {
          return content.text.length > 0;
        }
        return true;
      });

      if (reasoning) {
        // Check if reasoning is already included
        const hasReasoning = sanitizedContent.some(
          (content) => content.type === 'reasoning'
        );
        
        if (!hasReasoning) {
          // @ts-expect-error: reasoning message parts in sdk is wip
          sanitizedContent.push({ type: 'reasoning', reasoning });
        }
      }

      return {
        ...message,
        content: sanitizedContent,
      };
    }

    return message;
  });

  return messagesBySanitizedContent.filter(
    (message) => Array.isArray(message.content) ? message.content.length > 0 : true,
  );
}

export function sanitizeUIMessages(messages: Array<Message>): Array<Message> {
  const messagesBySanitizedToolInvocations = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (!message.toolInvocations) return message;

    const toolResultIds: Array<string> = [];

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.state === 'result') {
        toolResultIds.push(toolInvocation.toolCallId);
      }
    }

    const sanitizedToolInvocations = message.toolInvocations.filter(
      (toolInvocation) =>
        toolInvocation.state === 'result' ||
        toolResultIds.includes(toolInvocation.toolCallId),
    );

    return {
      ...message,
      toolInvocations: sanitizedToolInvocations,
    };
  });

  return messagesBySanitizedToolInvocations.filter(
    (message) =>
      message.content.length > 0 ||
      (message.toolInvocations && message.toolInvocations.length > 0),
  );
}

export function getMostRecentUserMessage(messages: Array<Message>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}
