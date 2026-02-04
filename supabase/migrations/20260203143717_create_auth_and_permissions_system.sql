/*
  # Authentication and Role-Based Access Control System

  1. New Tables
    - `user_profiles` - Extended user profile data
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text) - admin, manager, user
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `service_permissions` - Service-level access control
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `service` (text) - gcp, aws, hetzner, jira, bitbucket
      - `can_read` (boolean)
      - `can_write` (boolean)
      - `created_at` (timestamp)
    
    - `kanban_permissions` - Kanban board permissions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `can_read` (boolean)
      - `can_write` (boolean)
      - `created_at` (timestamp)

  2. Changes to Existing Tables
    - Update `todos` table to include:
      - `assigned_by` (uuid, references user_profiles)
      - `assigned_to_user` (uuid, references user_profiles)
      - `assigned_at` (timestamp)
      - `created_by` (uuid, references user_profiles)

  3. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Admins can do everything
    - Users can only see their own data or data assigned to them
    - Service permissions control billing data access
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = id
  );

-- Create service_permissions table
CREATE TABLE IF NOT EXISTS service_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('gcp', 'aws', 'hetzner', 'jira', 'bitbucket')),
  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, service)
);

ALTER TABLE service_permissions ENABLE ROW LEVEL SECURITY;

-- Service permissions policies
CREATE POLICY "Users can view own service permissions"
  ON service_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all service permissions"
  ON service_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage service permissions"
  ON service_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create kanban_permissions table
CREATE TABLE IF NOT EXISTS kanban_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  can_read boolean DEFAULT false,
  can_write boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanban_permissions ENABLE ROW LEVEL SECURITY;

-- Kanban permissions policies
CREATE POLICY "Users can view own kanban permissions"
  ON kanban_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all kanban permissions"
  ON kanban_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage kanban permissions"
  ON kanban_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add columns to todos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE todos ADD COLUMN assigned_by uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'assigned_to_user'
  ) THEN
    ALTER TABLE todos ADD COLUMN assigned_to_user uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE todos ADD COLUMN assigned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE todos ADD COLUMN created_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Drop temporary policy
DROP POLICY IF EXISTS "Temporary allow all for todos" ON todos;

-- Todos RLS policies
CREATE POLICY "Users can view own tasks"
  ON todos FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR auth.uid() = assigned_to_user
    OR auth.uid() = assigned_by
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert tasks with kanban write permission"
  ON todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM kanban_permissions
        WHERE user_id = auth.uid() AND can_write = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Users can update own tasks with kanban write permission"
  ON todos FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = created_by OR auth.uid() = assigned_by)
    AND (
      EXISTS (
        SELECT 1 FROM kanban_permissions
        WHERE user_id = auth.uid() AND can_write = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
  WITH CHECK (
    (auth.uid() = created_by OR auth.uid() = assigned_by)
    AND (
      EXISTS (
        SELECT 1 FROM kanban_permissions
        WHERE user_id = auth.uid() AND can_write = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Users can delete own tasks with kanban write permission"
  ON todos FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM kanban_permissions
        WHERE user_id = auth.uid() AND can_write = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
