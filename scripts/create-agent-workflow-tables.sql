-- Create agent workflow tables for Supabase
-- Run this in the Supabase SQL Editor to set up the necessary tables

-- Table for storing agent workflows
CREATE TABLE IF NOT EXISTS public.agent_workflow (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  entry_point_agent_id TEXT,
  
  -- Add RLS policy for security
  CONSTRAINT user_owns_workflow FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for storing versions of agent workflows
CREATE TABLE IF NOT EXISTS public.agent_workflow_version (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.agent_workflow(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  agents JSONB NOT NULL DEFAULT '[]'::JSONB,
  connections JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add unique constraint to ensure only one version number per workflow
  CONSTRAINT unique_workflow_version UNIQUE (workflow_id, version)
);

-- Add Row Level Security policies
ALTER TABLE public.agent_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workflow_version ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_workflow table
CREATE POLICY "Users can view their own workflows"
  ON public.agent_workflow
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflows"
  ON public.agent_workflow
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.agent_workflow
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.agent_workflow
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for agent_workflow_version table
CREATE POLICY "Users can view versions of their workflows"
  ON public.agent_workflow_version
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agent_workflow
    WHERE agent_workflow.id = agent_workflow_version.workflow_id
    AND agent_workflow.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert versions of their workflows"
  ON public.agent_workflow_version
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_workflow
    WHERE agent_workflow.id = agent_workflow_version.workflow_id
    AND agent_workflow.user_id = auth.uid()
  ));

CREATE POLICY "Users can update versions of their workflows"
  ON public.agent_workflow_version
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agent_workflow
    WHERE agent_workflow.id = agent_workflow_version.workflow_id
    AND agent_workflow.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete versions of their workflows"
  ON public.agent_workflow_version
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agent_workflow
    WHERE agent_workflow.id = agent_workflow_version.workflow_id
    AND agent_workflow.user_id = auth.uid()
  ));

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_version ON public.agent_workflow_version (workflow_id, version);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the timestamp
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.agent_workflow
FOR EACH ROW
EXECUTE FUNCTION update_timestamp(); 