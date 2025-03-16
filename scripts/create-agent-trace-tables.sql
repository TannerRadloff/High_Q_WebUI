-- Agent Trace Tables Creation Script
-- This script creates tables for storing agent traces in Supabase
-- Aligned with OpenAI's tracing structure

-- Create the agent_trace table
CREATE TABLE IF NOT EXISTS public.agent_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT NOT NULL,
  trace_id TEXT NOT NULL UNIQUE,
  group_id TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  chat_id UUID REFERENCES public.chat(id),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the agent_trace_span table
CREATE TABLE IF NOT EXISTS public.agent_trace_span (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  span_id TEXT NOT NULL UNIQUE,
  trace_id TEXT NOT NULL REFERENCES public.agent_trace(trace_id) ON DELETE CASCADE,
  parent_id TEXT,
  name TEXT NOT NULL,
  span_type TEXT NOT NULL CHECK (span_type IN ('agent', 'generation', 'function', 'guardrail', 'handoff', 'custom')),
  span_data JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_trace_trace_id ON public.agent_trace(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_trace_user_id ON public.agent_trace(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_trace_chat_id ON public.agent_trace(chat_id);
CREATE INDEX IF NOT EXISTS idx_agent_trace_span_trace_id ON public.agent_trace_span(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_trace_span_parent_id ON public.agent_trace_span(parent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.agent_trace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_trace_span ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_trace
CREATE POLICY "Users can view their own traces"
  ON public.agent_trace
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own traces"
  ON public.agent_trace
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own traces"
  ON public.agent_trace
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create policies for agent_trace_span
CREATE POLICY "Users can view spans for their traces"
  ON public.agent_trace_span
  FOR SELECT
  USING (trace_id IN (
    SELECT trace_id FROM public.agent_trace WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert spans for their traces"
  ON public.agent_trace_span
  FOR INSERT
  WITH CHECK (trace_id IN (
    SELECT trace_id FROM public.agent_trace WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update spans for their traces"
  ON public.agent_trace_span
  FOR UPDATE
  USING (trace_id IN (
    SELECT trace_id FROM public.agent_trace WHERE user_id = auth.uid()
  ));

-- Allow anonymous access for development purposes
-- Remove these in production if not needed
CREATE POLICY "Allow anonymous select on agent_trace"
  ON public.agent_trace
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on agent_trace"
  ON public.agent_trace
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on agent_trace"
  ON public.agent_trace
  FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous select on agent_trace_span"
  ON public.agent_trace_span
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert on agent_trace_span"
  ON public.agent_trace_span
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update on agent_trace_span"
  ON public.agent_trace_span
  FOR UPDATE
  TO anon
  USING (true); 