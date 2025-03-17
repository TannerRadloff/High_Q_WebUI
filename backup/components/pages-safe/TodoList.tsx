'use client';

/**
 * This is a wrapper component for TodoList that's safe to use
 * in the pages directory, preventing server component imports
 */

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/index';

type Todo = {
  id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
};

// Individual Todo item component
function Todo({
  id,
  title,
  is_complete,
  onToggle,
  onDelete
}: {
  id: string;
  title: string;
  is_complete: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  const supabase = createBrowserClient();
  
  const handleToggle = async () => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: !is_complete })
        .eq('id', id);
        
      if (error) throw error;
      
      if (onToggle) onToggle();
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };
  
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };
  
  return (
    <li className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={is_complete}
          onChange={handleToggle}
          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span 
          className={`ml-3 text-gray-800 ${is_complete ? 'line-through text-gray-400' : ''}`}
        >
          {title}
        </span>
      </div>
      <button
        onClick={handleDelete}
        className="text-red-500 hover:text-red-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}

// Todo form component
function TodoForm({ onAddTodo }: { onAddTodo: (title: string) => void }) {
  const [title, setTitle] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    onAddTodo(title);
    setTitle('');
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new todo..."
          className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add
        </button>
      </div>
    </form>
  );
}

// Main TodoList component
export default function PagesCompatibleTodoList({ initialTodos = [] }: { initialTodos?: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [isLoading, setIsLoading] = useState(false);
  
  const supabase = createBrowserClient();
  
  useEffect(() => {
    // Initial fetch if no initialTodos provided
    if (initialTodos.length === 0) {
      fetchTodos();
    }
    
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