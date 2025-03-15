'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type TodoProps = {
  id: string;
  title: string;
  is_complete: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
};

export default function Todo({ id, title, is_complete, onToggle, onDelete }: TodoProps) {
  const [isComplete, setIsComplete] = useState(is_complete);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const supabase = createClient();
  
  const handleToggle = async () => {
    try {
      setIsUpdating(true);
      const newStatus = !isComplete;
      
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setIsComplete(newStatus);
      if (onToggle) onToggle();
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting todo:', error);
      setIsDeleting(false);
    }
  };
  
  return (
    <li className="p-3 border rounded-md flex items-center justify-between bg-white shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center">
        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 ${
            isComplete 
              ? 'bg-green-500 border-green-600 text-white' 
              : 'border-gray-300 bg-white'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={isComplete ? "Mark as incomplete" : "Mark as complete"}
        >
          {isComplete && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <span className={`${isComplete ? 'line-through text-gray-500' : 'text-gray-800'}`}>
          {title}
        </span>
      </div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`text-red-500 hover:text-red-700 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Delete todo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </li>
  );
} 