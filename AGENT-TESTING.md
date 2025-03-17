# Agent Testing Guide

This guide explains how to test the Mimir agent orchestration logic to ensure it correctly delegates tasks to specialized agents when appropriate.

## Setup

1. Make sure you have Node.js installed on your system.
2. Install the required dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

## Running the Tests

### Simple Test

The simple test focuses on a single prompt to verify if the Mimir agent correctly delegates to the Research Agent for car buying advice:

```bash
npm run test-simple
```

This will run the `test-agent.js` script, which tests the prompt "I want to buy a car, what should I do?" and expects delegation to the Research Agent.

### Comprehensive Test

The comprehensive test runs multiple prompts to verify different delegation scenarios:

```bash
npm run test-comprehensive
```

This will run the `test-agent-comprehensive.js` script, which tests the following scenarios:

1. Simple greeting (expected to be handled directly by Mimir)
2. Car buying advice (expected to be delegated to Research Agent)
3. Coding question (expected to be delegated to Coding Agent)
4. Data analysis request (expected to be delegated to Data Analysis Agent)
5. Writing assistance (expected to be delegated to Writing Agent)
6. Multi-domain question (expected to be delegated to Data Analysis Agent)

### TypeScript Test

For a more integrated test that uses the actual agent implementation:

```bash
npm run test-agents
```

This will run the TypeScript test script that uses the actual agent implementation from the codebase.

## Test Results

The test results will show:

- Which agent was selected for each prompt
- Which model was used (gpt-4 or gpt-3.5-turbo)
- Whether the test passed or failed
- A summary of the pass rate

## Troubleshooting

If you encounter errors:

1. Make sure your OpenAI API key is valid and has sufficient quota
2. Check that you have installed all dependencies
3. Verify that the `.env.local` file is in the root directory
4. If you see "Error: Cannot find module..." errors, try running `npm install` again

## Modifying Tests

To add new test cases:

1. Open the test script you want to modify
2. Add a new entry to the `testPrompts` array with:
   - `name`: A descriptive name for the test
   - `prompt`: The user prompt to test
   - `expectedAgent`: The agent you expect to handle this prompt
   - `expectedModel`: The model you expect to be used (HIGH_QUALITY_MODEL or COST_EFFICIENT_MODEL)

## Adjusting Agent Behavior

If the tests are failing because the agent is not delegating as expected:

1. Review the system instructions in the `MIMIR_INSTRUCTION` constant
2. Adjust the delegation criteria in the `isSimple` function
3. Make sure the function descriptions clearly indicate when each specialized agent should be used 