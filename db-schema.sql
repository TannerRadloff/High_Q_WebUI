-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflows table to store saved agent workflows per user
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  graph JSONB NOT NULL, -- Workflow graph definition (nodes and edges JSON as saved from React Flow)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tasks table to track agent tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL, -- Nullable if not part of a specific workflow
  description TEXT NOT NULL,
  agent TEXT NOT NULL, -- Which agent handled it, e.g. "ResearchAgent" or "Mimir"
  status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'error')),
  result JSONB, -- Store the output of the task, or at least a summary
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- If a task was spawned by another task
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Messages table to store full conversation logs (optional)
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system') OR role LIKE 'agent:%'),
  content TEXT NOT NULL,
  session_id UUID NOT NULL, -- To group messages into conversations
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- If this message is associated with a task
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Files metadata table (optional)
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- If this file is associated with a task
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL, -- If this file is associated with a workflow
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task steps table to track individual node executions within a workflow
CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- ID of the node in the workflow
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  input JSONB,
  output JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Task instructions table to store user instructions during workflow execution
CREATE TABLE IF NOT EXISTS task_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON workflows(user_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_workflow_id_idx ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS tasks_parent_task_id_idx ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_task_id_idx ON chat_messages(task_id);
CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id);
CREATE INDEX IF NOT EXISTS files_task_id_idx ON files(task_id);
CREATE INDEX IF NOT EXISTS files_workflow_id_idx ON files(workflow_id);
CREATE INDEX IF NOT EXISTS task_steps_task_id_idx ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS task_instructions_task_id_idx ON task_instructions(task_id);
CREATE INDEX IF NOT EXISTS task_instructions_applied_idx ON task_instructions(applied);

-- Enable Row Level Security (RLS)
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instructions ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflows
CREATE POLICY workflows_user_access ON workflows
  USING (user_id = auth.uid());

-- RLS policies for tasks
CREATE POLICY tasks_user_access ON tasks
  USING (user_id = auth.uid());

-- RLS policies for chat_messages
CREATE POLICY chat_messages_user_access ON chat_messages
  USING (user_id = auth.uid());

-- RLS policies for files
CREATE POLICY files_user_access ON files
  USING (user_id = auth.uid());

-- RLS policies for task_steps
CREATE POLICY task_steps_user_access ON task_steps
  USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

-- RLS policies for task_instructions
CREATE POLICY task_instructions_user_access ON task_instructions
  USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())); 