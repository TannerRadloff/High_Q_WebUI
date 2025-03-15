-- Supabase Tables Creation and RLS Setup Script
-- ================================================
--
-- This script will:
-- 1. Create the required tables in the Supabase database
-- 2. Apply RLS policies to control access to these tables
--
-- Usage:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste this entire script
-- 5. Run the script

-- ================================================
-- PART 1: CREATE TABLES
-- ================================================

-- Create the chat table
CREATE TABLE IF NOT EXISTS public.chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public'))
);

-- Create the message table
CREATE TABLE IF NOT EXISTS public.message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'data')),
  content TEXT NOT NULL,
  chat_id UUID NOT NULL REFERENCES public.chat(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  document_id UUID,
  artifact_title TEXT
);

-- Create the vote table
CREATE TABLE IF NOT EXISTS public.vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chat(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.message(id) ON DELETE CASCADE,
  is_upvoted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the document table
CREATE TABLE IF NOT EXISTS public.document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS chat_user_id_idx ON public.chat(user_id);
CREATE INDEX IF NOT EXISTS message_chat_id_idx ON public.message(chat_id);
CREATE INDEX IF NOT EXISTS vote_chat_id_idx ON public.vote(chat_id);
CREATE INDEX IF NOT EXISTS vote_message_id_idx ON public.vote(message_id);
CREATE INDEX IF NOT EXISTS document_user_id_idx ON public.document(user_id);
CREATE INDEX IF NOT EXISTS todos_created_at_idx ON public.todos(created_at);

-- ================================================
-- PART 2: ENABLE ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on tables
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ================================================
-- PART 3: CREATE HELPER FUNCTIONS
-- ================================================

-- Helper function to check if a user owns a chat
CREATE OR REPLACE FUNCTION public.is_chat_owner(chat_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat 
    WHERE id = chat_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a chat is public
CREATE OR REPLACE FUNCTION public.is_chat_public(chat_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat 
    WHERE id = chat_id 
    AND visibility = 'public'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- PART 4: CREATE POLICIES FOR EACH TABLE
-- ================================================

-- Policies for the chat table
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chat;
DROP POLICY IF EXISTS "Users can view public chats" ON public.chat;
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chat;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chat;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chat;

CREATE POLICY "Users can view their own chats" 
  ON public.chat FOR SELECT 
  USING (user_id = auth.uid());
  
CREATE POLICY "Users can view public chats" 
  ON public.chat FOR SELECT 
  USING (visibility = 'public');
  
CREATE POLICY "Users can insert their own chats" 
  ON public.chat FOR INSERT 
  WITH CHECK (user_id = auth.uid());
  
CREATE POLICY "Users can update their own chats" 
  ON public.chat FOR UPDATE 
  USING (user_id = auth.uid());
  
CREATE POLICY "Users can delete their own chats" 
  ON public.chat FOR DELETE 
  USING (user_id = auth.uid());

-- Policies for the message table
DROP POLICY IF EXISTS "Users can view messages in their own chats" ON public.message;
DROP POLICY IF EXISTS "Users can view messages in public chats" ON public.message;
DROP POLICY IF EXISTS "Users can insert messages in their own chats" ON public.message;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.message;

CREATE POLICY "Users can view messages in their own chats" 
  ON public.message FOR SELECT 
  USING (is_chat_owner(chat_id));
  
CREATE POLICY "Users can view messages in public chats" 
  ON public.message FOR SELECT 
  USING (is_chat_public(chat_id));
  
CREATE POLICY "Users can insert messages in their own chats" 
  ON public.message FOR INSERT 
  WITH CHECK (is_chat_owner(chat_id));
  
CREATE POLICY "Users can delete their own messages" 
  ON public.message FOR DELETE 
  USING (chat_id IN (
    SELECT id FROM public.chat WHERE user_id = auth.uid()
  ));

-- Policies for the vote table
DROP POLICY IF EXISTS "Users can view votes for their chats" ON public.vote;
DROP POLICY IF EXISTS "Users can view votes for public chats" ON public.vote;
DROP POLICY IF EXISTS "Users can insert votes" ON public.vote;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.vote;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.vote;

CREATE POLICY "Users can view votes for their chats" 
  ON public.vote FOR SELECT 
  USING (chat_id IN (
    SELECT id FROM public.chat WHERE user_id = auth.uid()
  ));
  
CREATE POLICY "Users can view votes for public chats" 
  ON public.vote FOR SELECT 
  USING (chat_id IN (
    SELECT id FROM public.chat WHERE visibility = 'public'
  ));
  
CREATE POLICY "Users can insert votes" 
  ON public.vote FOR INSERT 
  WITH CHECK (
    chat_id IN (
      SELECT id FROM public.chat 
      WHERE user_id = auth.uid() OR visibility = 'public'
    )
  );
  
CREATE POLICY "Users can update their own votes" 
  ON public.vote FOR UPDATE 
  USING (chat_id IN (
    SELECT id FROM public.chat WHERE user_id = auth.uid()
  ));
  
CREATE POLICY "Users can delete their own votes" 
  ON public.vote FOR DELETE 
  USING (chat_id IN (
    SELECT id FROM public.chat WHERE user_id = auth.uid()
  ));

-- Policies for the document table
DROP POLICY IF EXISTS "Users can view their own documents" ON public.document;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.document;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.document;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.document;

CREATE POLICY "Users can view their own documents" 
  ON public.document FOR SELECT 
  USING (user_id = auth.uid() OR user_id IS NULL);
  
CREATE POLICY "Users can insert their own documents" 
  ON public.document FOR INSERT 
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  
CREATE POLICY "Users can update their own documents" 
  ON public.document FOR UPDATE 
  USING (user_id = auth.uid() OR user_id IS NULL);
  
CREATE POLICY "Users can delete their own documents" 
  ON public.document FOR DELETE 
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Policies for the todos table
DROP POLICY IF EXISTS "Allow public access to todos" ON public.todos;

CREATE POLICY "Allow public access to todos" 
  ON public.todos 
  USING (true) 
  WITH CHECK (true);

-- ================================================
-- Done! Your tables and RLS policies are now set up
-- ================================================ 