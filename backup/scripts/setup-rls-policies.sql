-- Supabase Row Level Security (RLS) Setup Script
-- ================================================
--
-- This script will apply RLS policies to the required tables in the Supabase project.
-- It ensures that users can only access and modify their own data, providing proper
-- security for the chat application.
--
-- Usage:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Paste this entire script
-- 5. Run the script

-- 1. Enable RLS on tables
ALTER TABLE public.chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document ENABLE ROW LEVEL SECURITY;

-- 2. Create helper functions

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

-- 3. Create policies for the chat table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chat;
DROP POLICY IF EXISTS "Users can view public chats" ON public.chat;
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chat;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chat;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chat;

-- Create new policies
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

-- 4. Create policies for the message table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages in their own chats" ON public.message;
DROP POLICY IF EXISTS "Users can view messages in public chats" ON public.message;
DROP POLICY IF EXISTS "Users can insert messages in their own chats" ON public.message;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.message;

-- Create new policies
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

-- 5. Create policies for the vote table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view votes for their chats" ON public.vote;
DROP POLICY IF EXISTS "Users can view votes for public chats" ON public.vote;
DROP POLICY IF EXISTS "Users can insert votes" ON public.vote;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.vote;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.vote;

-- Create new policies
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

-- 6. Create policies for the document table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own documents" ON public.document;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.document;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.document;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.document;

-- Create new policies
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

-- Done! 