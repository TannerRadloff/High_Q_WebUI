import { createClient } from '@/utils/supabase/server';

export default async function Notes() {
  const supabase = await createClient();
  const { data: notes } = await supabase.from("notes").select();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">My Notes</h1>
      
      {notes && notes.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <pre className="p-6 bg-gray-50 text-gray-800 overflow-auto">
            {JSON.stringify(notes, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No notes found. Make sure you've created the notes table in Supabase.</p>
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-500">
        <p>To add more notes, run SQL queries in your Supabase dashboard.</p>
      </div>
    </div>
  );
} 