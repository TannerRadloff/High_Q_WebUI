import { BaseAgent } from '../agents/BaseAgent';
import { webSearchTool, fileSearchTool, computerTool } from '../agents/tools';
import { AgentRunner } from '../runner';

/**
 * This example demonstrates how to use our implementation in a way that matches
 * OpenAI's Agents SDK example from the documentation.
 */
async function main() {
  // Create an agent with tools, similar to OpenAI's example:
  // from agents import Agent, FileSearchTool, Runner, WebSearchTool
  // agent = Agent(
  //     name="Assistant",
  //     tools=[
  //         WebSearchTool(),
  //         FileSearchTool(
  //             max_num_results=3,
  //             vector_store_ids=["VECTOR_STORE_ID"],
  //         ),
  //     ],
  // )
  const agent = new BaseAgent({
    name: "Assistant",
    instructions: "You are a helpful assistant that can search the web and retrieve information from files.",
    tools: [
      webSearchTool,
      fileSearchTool,
      computerTool
    ],
  });

  // Run the agent using the Runner, similar to OpenAI's example:
  // async def main():
  //     result = await Runner.run(agent, "Which coffee shop should I go to, taking into account my preferences and the weather today in SF?")
  //     print(result.final_output)
  const result = await AgentRunner.run(
    agent, 
    "Which coffee shop should I go to, taking into account my preferences and the weather today in SF?"
  );
  
  // Print the final output
  console.log(result.final_output);
}

// Run the example
main().catch(console.error); 