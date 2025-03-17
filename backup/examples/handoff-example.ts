/**
 * Example demonstrating proper handoff implementation following OpenAI's Agents SDK patterns
 */
import { BaseAgent } from '../agents/BaseAgent';
import { z } from 'zod';
import { handoff, handoffFilters, promptWithHandoffInstructions } from '../agents/handoff';

// Define specialized agents
class CustomerSupportAgent extends BaseAgent {
  constructor() {
    super({
      name: 'CustomerSupportAgent',
      instructions: promptWithHandoffInstructions(`You help customers with general inquiries and support.`),
      model: 'gpt-4o'
    });
  }
}

class OrderStatusAgent extends BaseAgent {
  constructor() {
    super({
      name: 'OrderStatusAgent',
      instructions: promptWithHandoffInstructions(`You help customers check their order status.`),
      model: 'gpt-4o'
    });
  }
}

class RefundAgent extends BaseAgent {
  constructor() {
    super({
      name: 'RefundAgent',
      instructions: promptWithHandoffInstructions(`You help customers process refund requests.`),
      model: 'gpt-4o'
    });
  }
}

// Create the specialized agents
const customerSupportAgent = new CustomerSupportAgent();
const orderStatusAgent = new OrderStatusAgent();
const refundAgent = new RefundAgent();

// Define input types with Zod schemas
const OrderStatusInputSchema = z.object({
  order_number: z.string().describe('The order number to check'),
  customer_email: z.string().optional().describe('Optional customer email for verification')
});

const RefundInputSchema = z.object({
  order_number: z.string().describe('The order number for the refund'),
  reason: z.string().describe('Reason for requesting a refund'),
  amount: z.number().optional().describe('Optional amount to refund')
});

// Define callback functions
const onRefundHandoff = async (ctx: any, inputData?: any) => {
  console.log(`Refund handoff called with reason: ${inputData?.reason}`);
  // In a real app, you might pre-fetch refund policy or order details here
};

const onOrderStatusHandoff = async (ctx: any) => {
  console.log('Order status handoff called');
  // In a real app, you might pre-fetch order status here
};

// Create a triage agent with handoffs
const triageAgent = new BaseAgent({
  name: 'TriageAgent',
  instructions: promptWithHandoffInstructions(`You are an eCommerce customer service agent. 
  Route customer inquiries to the appropriate specialized agent:
  
  - For general questions, handle them yourself
  - For order status inquiries, use the transfer_to_order_status_agent tool
  - For refund requests, use the process_refund tool
  
  Always be helpful and empathetic to customer needs.`),
  model: 'gpt-4o',
  
  // Define handoffs with customizations
  handoffs: [
    customerSupportAgent, // Basic handoff without customization
    
    // Customized handoff with callback and input validation
    handoff(
      orderStatusAgent,
      {
        toolNameOverride: 'transfer_to_order_status_agent',
        onHandoff: onOrderStatusHandoff,
        inputType: OrderStatusInputSchema,
        inputFilter: handoffFilters.removeAllTools // Remove tool calls from history
      }
    ),
    
    // Customized handoff with custom tool name and description
    handoff(
      refundAgent,
      {
        toolNameOverride: 'process_refund',
        toolDescriptionOverride: 'Process a refund request for a customer',
        onHandoff: onRefundHandoff,
        inputType: RefundInputSchema
      }
    )
  ],
  
  // Global input filter for all handoffs that don't specify one
  handoffInputFilter: handoffFilters.preserveLastN(5)
});

// Export the triage agent for use
export default triageAgent;

// Example usage
async function runExample() {
  try {
    const response = await triageAgent.handleTask(
      "I need a refund for my order #12345 because the product arrived damaged.",
      { userId: "user123" }
    );
    console.log("Response:", response);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample();
} 