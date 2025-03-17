-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create custom_agents table
CREATE TABLE IF NOT EXISTS public.custom_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for workflows
CREATE POLICY "Users can view their own workflows"
    ON public.workflows
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
    ON public.workflows
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
    ON public.workflows
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policies for custom_agents
CREATE POLICY "Users can view their own custom agents"
    ON public.custom_agents
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom agents"
    ON public.custom_agents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom agents"
    ON public.custom_agents
    FOR UPDATE
    USING (auth.uid() = user_id); 