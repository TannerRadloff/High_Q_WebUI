import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

interface Todo {
  id: string;
  title: string;
  // Add other fields as needed
}

function Page() {
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    async function getTodos() {
      const { data: todos } = await supabase.from('todos').select()

      if (todos && todos.length > 0) {
        setTodos(todos as Todo[])
      }
    }

    getTodos()
  }, [])

  return (
    <div>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </div>
  )
}

export default Page 