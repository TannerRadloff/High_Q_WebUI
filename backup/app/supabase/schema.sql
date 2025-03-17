-- Create the notes table
create table notes (
  id bigint primary key generated always as identity,
  title text not null
);

-- Insert some sample data into the table
insert into notes (title)
values
  ('Today I created a Supabase project.'),
  ('I added some data and queried it from Next.js.'),
  ('It was awesome!');

-- Enable row level security
alter table notes enable row level security;

-- Create policy to make notes readable by anyone
create policy "public can read notes"
on public.notes
for select to anon
using (true); 