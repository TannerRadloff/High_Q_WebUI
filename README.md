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
