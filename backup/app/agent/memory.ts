import { AgentContext } from './agent';

/**
 * Types of memory supported by the system
 */
export enum MemoryType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  CONVERSATION = 'conversation',
  SYSTEM = 'system'
}

/**
 * A memory item stored in the memory system
 */
export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  metadata: {
    timestamp: string;
    source: string;
    tags?: string[];
    [key: string]: any;
  };
  relevanceScore?: number;
}

/**
 * Interface for memory storage providers
 */
export interface MemoryStorage {
  /**
   * Store a memory item
   */
  store(item: MemoryItem): Promise<string>;
  
  /**
   * Retrieve a memory item by ID
   */
  retrieve(id: string): Promise<MemoryItem | null>;
  
  /**
   * Search for memory items based on query
   */
  search(query: string, options?: {
    type?: MemoryType;
    limit?: number;
    tags?: string[];
    timeRange?: {
      start?: Date;
      end?: Date;
    };
  }): Promise<MemoryItem[]>;
  
  /**
   * Update a memory item
   */
  update(id: string, updates: Partial<MemoryItem>): Promise<boolean>;
  
  /**
   * Delete a memory item
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Simple in-memory storage implementation
 */
export class InMemoryStorage implements MemoryStorage {
  private items: Map<string, MemoryItem> = new Map();
  
  async store(item: MemoryItem): Promise<string> {
    this.items.set(item.id, item);
    return item.id;
  }
  
  async retrieve(id: string): Promise<MemoryItem | null> {
    return this.items.get(id) || null;
  }
  
  async search(query: string, options?: {
    type?: MemoryType;
    limit?: number;
    tags?: string[];
    timeRange?: {
      start?: Date;
      end?: Date;
    };
  }): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    
    for (const item of this.items.values()) {
      // Filter by type if specified
      if (options?.type && item.type !== options.type) {
        continue;
      }
      
      // Filter by tags if specified
      if (options?.tags && options.tags.length > 0) {
        if (!item.metadata.tags || !options.tags.some(tag => item.metadata.tags?.includes(tag))) {
          continue;
        }
      }
      
      // Filter by time range if specified
      if (options?.timeRange) {
        const itemDate = new Date(item.metadata.timestamp);
        
        if (options.timeRange.start && itemDate < options.timeRange.start) {
          continue;
        }
        
        if (options.timeRange.end && itemDate > options.timeRange.end) {
          continue;
        }
      }
      
      // Simple text search (in a real implementation, use vector embeddings)
      if (query && !item.content.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }
      
      // Add to results
      results.push({
        ...item,
        // In a real implementation, compute an actual relevance score
        relevanceScore: 1.0
      });
    }
    
    // Sort by relevance
    results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // Apply limit
    if (options?.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }
    
    return results;
  }
  
  async update(id: string, updates: Partial<MemoryItem>): Promise<boolean> {
    const item = this.items.get(id);
    
    if (!item) {
      return false;
    }
    
    this.items.set(id, {
      ...item,
      ...updates,
      metadata: {
        ...item.metadata,
        ...(updates.metadata || {})
      }
    });
    
    return true;
  }
  
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}

/**
 * Agent memory manager
 */
export class MemoryManager {
  private storage: MemoryStorage;
  private agentName: string;
  
  constructor(storage: MemoryStorage, agentName: string) {
    this.storage = storage;
    this.agentName = agentName;
  }
  
  /**
   * Store a memory
   */
  async store(content: string, type: MemoryType, metadata: Record<string, any> = {}): Promise<string> {
    const id = `${this.agentName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const memory: MemoryItem = {
      id,
      type,
      content,
      metadata: {
        timestamp: new Date().toISOString(),
        source: this.agentName,
        ...metadata
      }
    };
    
    return this.storage.store(memory);
  }
  
  /**
   * Retrieve memories based on a query
   */
  async retrieve(query: string, options?: {
    type?: MemoryType;
    limit?: number;
    tags?: string[];
    timeRange?: {
      start?: Date;
      end?: Date;
    };
  }): Promise<MemoryItem[]> {
    return this.storage.search(query, options);
  }
  
  /**
   * Get the most recent memories of a specific type
   */
  async getRecent(type: MemoryType, limit: number = 5): Promise<MemoryItem[]> {
    const results = await this.storage.search('', { type });
    
    // Sort by timestamp (newest first)
    results.sort((a, b) => {
      return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime();
    });
    
    return results.slice(0, limit);
  }
  
  /**
   * Add conversation memory from a user interaction
   */
  async addConversationMemory(userInput: string, agentResponse: string): Promise<string> {
    return this.store(
      JSON.stringify({ user: userInput, agent: agentResponse }),
      MemoryType.CONVERSATION,
      { interaction: true }
    );
  }
  
  /**
   * Get recent conversation history
   */
  async getConversationHistory(limit: number = 10): Promise<{ user: string; agent: string }[]> {
    const memories = await this.getRecent(MemoryType.CONVERSATION, limit);
    
    return memories.map(memory => {
      try {
        return JSON.parse(memory.content);
      } catch (e) {
        console.error('Error parsing conversation memory:', e);
        return { user: '', agent: '' };
      }
    });
  }
  
  /**
   * Enhance context with relevant memories
   */
  async enhanceContext(context: AgentContext, query: string): Promise<AgentContext> {
    // Get conversation history
    const conversationHistory = await this.getConversationHistory(5);
    
    // Get relevant memories based on the query
    const relevantMemories = await this.retrieve(query, {
      limit: 3,
      type: MemoryType.LONG_TERM
    });
    
    // Add to context
    return {
      ...context,
      conversationHistory,
      memory: {
        relevantMemories: relevantMemories.map(memory => ({
          content: memory.content,
          timestamp: memory.metadata.timestamp
        }))
      }
    };
  }
} 