/*
  # Create Todos Table

  1. New Tables
    - `todos` - Task management for kanban board
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `status` (text) - todo, in-progress, done
      - `priority` (text) - low, medium, high
      - `assigned_to` (text) - legacy field for name
      - `due_date` (timestamp)
      - `tags` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Temporary open policies (will be restricted after auth setup)
*/

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to text,
  due_date timestamptz,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Temporary policy allowing all operations (will be replaced with proper auth)
CREATE POLICY "Temporary allow all for todos"
  ON todos FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_todos_updated_at_trigger ON todos;
CREATE TRIGGER update_todos_updated_at_trigger
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_todos_updated_at();
