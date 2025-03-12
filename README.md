<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Next.js AI Chatbot</h1>
</a>

## OpenAI Responses API Update

This project has been updated to use OpenAI's new Responses API instead of the Chat Completions API. The Responses API is OpenAI's newest core API and an agentic API primitive, combining the simplicity of Chat Completions with the ability to do more agentic tasks.

### Key Changes:

1. Updated `@ai-sdk/openai` to version 2.0.0 and `ai` to version 5.0.0
2. Changed model initialization from `openai(modelId)` to `openai.responses(modelId)`
3. Updated API parameters:
   - Changed `prompt` to `input` in generateText calls
   - Changed `messages` to `inputs` in streamText calls
4. Updated response handling to work with the new Responses API format
   - The Responses API returns `output_text` instead of `message.content`

### Benefits of the Responses API:

- Simpler event-driven architecture
- Better support for agentic tasks
- Built-in tools for web search, file search, and computer use
- Clearer semantic events for better integration

---

A full-featured Next.js 14 and App Router-ready AI chatbot built with:

- Next.js 14 App Router
- Vercel AI SDK
- OpenAI (GPT-4o, GPT-o1, GPT-o3 mini)
- Vercel Postgres
- Drizzle ORM
- Auth.js
- Tailwind CSS
- Artifacts (documents, code, spreadsheets)
- File attachments

## Features

- [x] Full-featured chat interface
- [x] Multiple model support (GPT-4o, GPT-o1, GPT-o3 mini)
- [x] Markdown support
- [x] Code highlighting with copy button
- [x] Drag-and-drop file uploads
- [x] Document creation and editing
- [x] Code generation with syntax highlighting
- [x] Spreadsheet creation and editing
- [x] Chat history
- [x] Chat sharing
- [x] Mobile support
- [x] Light/Dark mode
- [x] AI-generated titles
- [x] Vercel Postgres database
- [x] Auth.js authentication
- [x] Fully typed (TypeScript)

## Model Providers

This template ships with OpenAI `gpt-4o` as the default. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

### Using the GPT-o1 Model

This template also supports OpenAI's advanced `GPT-o1` model. To use this model:

1. Ensure your OpenAI API key has access to the o1 model. You can check your model access at: https://platform.openai.com/account/models
2. If you encounter errors when using the o1 model, the application will automatically fall back to using gpt-4o.
3. Note that the o1 model may require a paid OpenAI account with sufficient usage credits.

The application implements multiple fallback mechanisms to ensure a smooth user experience even if the o1 model is not available or encounters errors.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET,OPENAI_API_KEY&envDescription=Learn%20more%20about%20how%20to%20get%20the%20API%20Keys%20for%20the%20application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI%20Chatbot&demo-description=An%20Open-Source%20AI%20Chatbot%20Template%20Built%20With%20Next.js%20and%20the%20AI%20SDK%20by%20Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&stores=[{%22type%22:%22postgres%22},{%22type%22:%22blob%22}])

## Running Locally

### Cloning the repository

```bash
git clone https://github.com/vercel/ai-chatbot.git
```

### Installing dependencies

```bash
npm install
```

### Configuration

1. Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

2. Update the environment variables in the `.env.local` file:

```
# OpenAI API Key - https://platform.openai.com/account/api-keys
OPENAI_API_KEY=

# Authentication
# Generate a random secret: https://generate-secret.vercel.app/32 or `openssl rand -base64 32`
AUTH_SECRET=

# Database
DATABASE_URL=

# Email (optional)
EMAIL_SERVER=
EMAIL_FROM=
```

### Database Setup

1. Create a database in Vercel Postgres or any other PostgreSQL provider.
2. Update the `DATABASE_URL` in the `.env.local` file.
3. Run the database migrations:

```bash
npm run db:migrate
```

### Starting the app

```bash
npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## TypeScript Setup

This project uses TypeScript for type safety. We've added custom type declarations to resolve issues with external modules.

### Setting Up TypeScript Types

Run the following command to install required TypeScript type packages:

```bash
npm run setup:types
# or
yarn setup:types
# or
pnpm setup:types
```

### Type Declarations

Custom type declarations are located in the `types/` directory:

- `lucide-react.d.ts` - Type definitions for Lucide React icons
- `ui-components.d.ts` - Type definitions for UI components
- `next-types.d.ts` - Type definitions for Next.js
- `vercel-modules.d.ts` - Type definitions for Vercel modules

If you encounter TypeScript errors, check if you need to add or update these type declarations.

# AI Chatbot with Agent Handoffs

This project implements a chatbot system that follows OpenAI Agent SDK patterns, with a focus on proper implementation of handoffs between specialized agents.

## Key Components

- **BaseAgent**: A foundation class that implements the core Agent functionality, including handoffs between agents
- **TriageAgent**: The entry point agent that analyzes user queries and determines which specialized agent should handle them
- **ResearchAgent**: An agent that performs research on topics using web search capabilities
- **ReportAgent**: An agent that formats and structures information into well-organized reports

## Agent Handoff Implementation

The system implements proper handoffs between agents following OpenAI Agent SDK patterns:

1. **Tool-based Handoffs**: Handoffs are implemented as function tools with names like `transfer_to_<agent_name>`

2. **Dynamic Decision-making**: The LLM decides when to initiate a handoff based on the task requirements

3. **Context Preservation**: When a handoff occurs, the entire conversation context is passed to the new agent

4. **Tracing**: Handoffs are tracked using a specialized `handoff_span` to monitor the flow between agents

5. **Streaming Support**: The system supports streaming responses during handoffs, with appropriate callbacks

## How Handoffs Work

1. The TriageAgent receives the initial user query and determines which specialized agent should handle it
2. The LLM can call a handoff tool like `transfer_to_researchagent` to delegate the task
3. When a handoff is detected, the BaseAgent's `handleToolCalls` method processes it:
   - It finds the target agent from the handoffs array
   - It passes the conversation history to maintain context
   - It creates a tracing span to record the handoff
   - It executes the target agent's `handleTask` method
   - It returns the result to the user

4. For combined tasks (research + report), the ResearchAgent can hand off to the ReportAgent once research is complete

## Examples

- **Research Query**: "What are the latest advancements in quantum computing?"
  - TriageAgent → ResearchAgent

- **Report Query**: "Format this data into a structured report with headings."
  - TriageAgent → ReportAgent

- **Combined Query**: "Research climate change and create a report with its impacts."
  - TriageAgent → ResearchAgent → ReportAgent

## Orchestration

The Runner class manages the workflow but does not directly control the flow between agents. Instead, it initiates the process with the TriageAgent and lets the agents decide when to hand off to each other using their specialized knowledge.

## Tracing and Monitoring

The system includes a tracing module that records spans for different operations, including handoffs. This allows for monitoring the flow of a conversation and understanding how agents collaborate to complete a task.
