'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Todo {
  id: string;
  title: string;
  // Add other fields as needed
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    async function getTodos() {
      const { data: todos } = await supabase.from('todos').select();

      if (todos && todos.length > 0) {
        setTodos(todos as Todo[]);
      }
    }

    getTodos();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Todos</h1>
      {todos.length > 0 ? (
        <ul className="list-disc pl-5">
          {todos.map((todo) => (
            <li key={todo.id} className="mb-2">
              {todo.title}
            </li>
          ))}
        </ul>
      ) : (
        <p>No todos found.</p>
      )}
    </div>
  );
} 

