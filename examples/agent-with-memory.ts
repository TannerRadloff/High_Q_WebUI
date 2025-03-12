import { AgentFactory, AgentType } from '../agents/AgentFactory';
import { webSearchTool } from '../agents/tools';
import { InMemoryStorage, MemoryType, MemoryManager } from '../agents/memory';

/**
 * This example demonstrates how agents can utilize memory to maintain context
 * and recall previous interactions throughout a conversation.
 */
async function main() {
  // Create a factory instance
  const factory = new AgentFactory();
  
  // Set default settings
  factory.setDefaults({
    model: 'gpt-4o',
    temperature: 0.5
  });
  
  // Create a shared memory storage instance to persist across example runs
  const memoryStorage = new InMemoryStorage();
  
  // Create a memory-enhanced agent
  const agent = factory.createAgent(AgentType.CUSTOM, {
    name: 'AssistantWithMemory',
    instructions: (context) => {
      const userName = context.userName || 'user';
      const conversationHistory = context.conversationHistory || [];
      const relevantMemories = context.relevantMemories || [];
      
      // Format conversation history if available
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = '\nOur recent conversation:\n' + 
          conversationHistory.map((exchange: { user: string; agent: string }) => 
            `${userName}: ${exchange.user}\nYou: ${exchange.agent}`
          ).join('\n\n');
      }
      
      // Format relevant memories if available
      let memoriesContext = '';
      if (relevantMemories.length > 0) {
        memoriesContext = '\nRelevant information I recall:\n' + 
          relevantMemories.map((memory: { content: string; timestamp: string }) => 
            `- ${memory.content} (from ${memory.timestamp})`
          ).join('\n');
      }
      
      // Include both in the instructions
      return `You are an assistant for ${userName} with the ability to remember past interactions.
      
      ${conversationContext}
      
      ${memoriesContext}
      
      When appropriate, refer to our conversation history or relevant memories to provide continuity.
      If you learn something important about the user or the conversation, remember it for future reference.`;
    },
    tools: [webSearchTool]
  });
  
  // Replace the default memory with our shared instance
  (agent as any).memory = new MemoryManager(memoryStorage, agent.name);
  
  // Define callbacks for streaming
  const callbacks = {
    onStart: () => console.log('Processing has started...'),
    onToken: (token: string) => process.stdout.write(token),
    onComplete: () => console.log('\n\n--- Processing complete ---\n'),
    onError: (error: Error) => console.error('Error:', error.message)
  };
  
  // Simulate a conversation with multiple turns
  const conversation = [
    "My name is Alex and I work in artificial intelligence research.",
    "What are some recent advancements in language models that could help my work?",
    "Can you remember what field I work in?",
    "I'm particularly interested in agent architectures. What should I focus on?",
    "Summarize what you know about me from our conversation."
  ];
  
  // Process each message in sequence
  for (const [index, message] of conversation.entries()) {
    console.log(`\n\n[Turn ${index + 1}] USER: ${message}\n`);
    
    // Create context for this turn
    const context = {
      userName: 'Alex',  // In a real app, you'd use the actual user's name
      timestamp: new Date().toISOString(),
      turnNumber: index + 1
    };
    
    // Process with streaming
    if (agent.streamTask) {
      await agent.streamTask(message, callbacks, context);
    } else {
      const result = await agent.handleTask(message, context);
      console.log(result.content);
      console.log('\n--- Processing complete ---\n');
    }
    
    // In a real app, you'd wait for user input between turns
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Demonstrate retrieving memories
  console.log('\n\nRetrieving stored memories about the user:');
  const userMemories = await (agent as any).memory.retrieve('Alex', {
    type: MemoryType.LONG_TERM,
    limit: 5
  });
  
  userMemories.forEach((memory: any) => {
    console.log(`- ${memory.content}`);
    console.log(`  Tags: ${memory.metadata.tags?.join(', ') || 'none'}`);
    console.log(`  Created: ${memory.metadata.timestamp}\n`);
  });
}

// Run the example
main().catch(console.error); 