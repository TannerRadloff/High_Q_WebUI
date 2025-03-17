# Mimir AI Chatbot with Agent Workflow Builder

A Next.js application featuring an AI chatbot with specialized agents and a workflow builder.

## Features

- **AI Chatbot**: Chat with Mimir, a triage agent that can delegate to specialized agents
- **Specialized Agents**: Research, Coding, Data Analysis, and Writing agents with specific tools
- **Workflow Builder**: Create and manage workflows that can be executed by the agents
- **Authentication**: User authentication and authorization using Supabase
- **API Routes**: Secure API routes for chat, workflows, tasks, and file uploads

## Structure

```
├── app/
│   ├── api/                # API routes
│   │   ├── query/          # Main chat endpoint
│   │   ├── runWorkflow/    # Workflow execution endpoint
│   │   ├── tasks/          # Task management endpoints
│   │   ├── upload/         # File upload endpoint
│   │   └── workflows/      # Workflow management endpoints
│   ├── agent-dashboard/    # Agent dashboard UI
│   ├── workflow-builder/   # Workflow builder UI
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # UI components
├── contexts/               # React contexts
│   ├── agent-context.tsx   # Agent context
│   ├── user-context.tsx    # User authentication context
│   └── workflow-context.tsx # Workflow management context
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
│   ├── agents/             # Agent system
│   │   ├── agent-base.ts   # Base agent class
│   │   ├── coding-agent.ts # Coding agent
│   │   ├── config.ts       # Agent configuration
│   │   ├── data-analysis-agent.ts # Data analysis agent
│   │   ├── index.ts        # Agent exports
│   │   ├── mimir-agent.ts  # Mimir triage agent
│   │   ├── research-agent.ts # Research agent
│   │   ├── runner.ts       # Agent runner
│   │   └── writing-agent.ts # Writing agent
│   ├── auth.ts             # Authentication utilities
│   └── supabase.ts         # Supabase client
├── public/                 # Static assets
├── .env.local.example      # Example environment variables
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
├── postcss.config.mjs      # PostCSS configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy the example environment variables:
```bash
cp .env.local.example .env.local
```

3. Update the environment variables in `.env.local` with your Supabase and OpenAI credentials.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Agent System

The application uses a system of specialized AI agents:

- **Mimir (Triage Agent)**: The main agent that decides whether to answer directly or delegate to a specialist
- **Research Agent**: Specialized in finding information using web search
- **Coding Agent**: Specialized in writing and explaining code
- **Data Analysis Agent**: Specialized in analyzing and visualizing data
- **Writing Agent**: Specialized in creating and improving written content

Each agent has specific tools and capabilities. The system uses OpenAI's API to power the agents.

## Environment Variables

The application requires the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `OPENAI_API_KEY`: Your OpenAI API key

Optional variables for customizing agent models and settings are available in `.env.local.example`. 