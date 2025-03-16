import { createSSRServerClient } from "@/lib/supabase/index";
import TodoList from "@/components/features/todos/TodoList";

type Todo = {
  id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
};

export default async function ExamplePage() {
  const supabase = await createSSRServerClient();
  
  const { data: todos, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching todos:", error);
    return <div>Error loading todos</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Todo Example</h1>
      <TodoList initialTodos={todos || []} />
    </div>
  );
} 