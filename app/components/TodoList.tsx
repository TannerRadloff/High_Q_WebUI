'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Todo from './Todo';
import TodoForm from './TodoForm';

type Todo = {
  id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
};

export default function TodoList({ initialTodos = [] }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [isLoading, setIsLoading] = useState(false);
  
  const supabase = createClient();
  
  useEffect(() => {
    // Set up a real-time subscription to todos
    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
        },
        async () => {
          // Refresh the todos when changes occur
          await fetchTodos();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddTodo = async (title: string) => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title, is_complete: false }])
        .select();
        
      if (error) throw error;
      
      if (data) {
        setTodos([...data, ...todos]);
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };
  
  const handleRefresh = () => {
    fetchTodos();
  };
  
  return (
    <div className="space-y-6">
      <TodoForm onAddTodo={handleAddTodo} />
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Todos</h2>
        <button 
          onClick={handleRefresh}
          className="text-blue-500 hover:text-blue-700 flex items-center"
          disabled={isLoading}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-1 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {todos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No todos yet. Add one above!
        </div>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <Todo
              key={todo.id}
              id={todo.id}
              title={todo.title}
              is_complete={todo.is_complete}
              onToggle={handleRefresh}
              onDelete={handleRefresh}
            />
          ))}
        </ul>
      )}
    </div>
  );
} 