-- Tasks table to track workflow executions
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'paused')),
  input TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Agent tasks table to track individual agent executions
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_id UUID, -- conversation or query ID
  description TEXT NOT NULL,
  agent TEXT NOT NULL, -- agent type or name
  status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'error')),
  result JSONB,
  parent_task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task steps table to track individual node executions
CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- ID of the node in the workflow
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  input TEXT,
  output TEXT,
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
CREATE INDEX IF NOT EXISTS tasks_workflow_id_idx ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS task_steps_task_id_idx ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS task_instructions_task_id_idx ON task_instructions(task_id);
CREATE INDEX IF NOT EXISTS task_instructions_applied_idx ON task_instructions(applied);
CREATE INDEX IF NOT EXISTS agent_tasks_user_id_idx ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS agent_tasks_query_id_idx ON agent_tasks(query_id);
CREATE INDEX IF NOT EXISTS agent_tasks_parent_task_id_idx ON agent_tasks(parent_task_id);

-- RLS policies for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_user_access ON tasks
  USING (user_id = auth.uid());

-- RLS policies for agent_tasks
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_tasks_user_access ON agent_tasks
  USING (user_id = auth.uid());

-- RLS policies for task_steps
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_steps_user_access ON task_steps
  USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid()));

-- RLS policies for task_instructions
ALTER TABLE task_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_instructions_user_access ON task_instructions
  USING (task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())); 