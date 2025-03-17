-- Enable Row Level Security (RLS) on tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instructions ENABLE ROW LEVEL SECURITY;

-- Create policies for workflows table
CREATE POLICY "Users can view their own workflows" 
ON workflows FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own workflows" 
ON workflows FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workflows" 
ON workflows FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workflows" 
ON workflows FOR DELETE 
USING (user_id = auth.uid());

-- Create policies for tasks table
CREATE POLICY "Users can view their own tasks" 
ON tasks FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tasks" 
ON tasks FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tasks" 
ON tasks FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tasks" 
ON tasks FOR DELETE 
USING (user_id = auth.uid());

-- Create policies for chat_messages table
CREATE POLICY "Users can view their own chat messages" 
ON chat_messages FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chat messages" 
ON chat_messages FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat messages" 
ON chat_messages FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat messages" 
ON chat_messages FOR DELETE 
USING (user_id = auth.uid());

-- Create policies for files table
CREATE POLICY "Users can view their own files" 
ON files FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own files" 
ON files FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files" 
ON files FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" 
ON files FOR DELETE 
USING (user_id = auth.uid());

-- Create policies for task_steps table
CREATE POLICY "Users can view their own task steps" 
ON task_steps FOR SELECT 
USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own task steps" 
ON task_steps FOR INSERT 
WITH CHECK (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own task steps" 
ON task_steps FOR UPDATE 
USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own task steps" 
ON task_steps FOR DELETE 
USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

-- Create policies for task_instructions table
CREATE POLICY "Users can view their own task instructions" 
ON task_instructions FOR SELECT 
USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own task instructions" 
ON task_instructions FOR INSERT 
WITH CHECK (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own task instructions" 
ON task_instructions FOR UPDATE 
USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own task instructions" 
ON task_instructions FOR DELETE 
USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())); 