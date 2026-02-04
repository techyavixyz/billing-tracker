/*
  # Helper Functions for User Management

  1. New Functions
    - `grant_admin_role` - Function to grant admin role to a user by email
    - `grant_all_permissions` - Function to grant all permissions to a user
    
  2. Usage
    - Admins can call these functions to quickly setup users
    - Useful for initial setup and user onboarding
*/

-- Function to grant admin role to a user by email
CREATE OR REPLACE FUNCTION grant_admin_role(user_email text)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET role = 'admin'
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant all permissions to a user by email
CREATE OR REPLACE FUNCTION grant_all_permissions(user_email text)
RETURNS void AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM user_profiles WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO service_permissions (user_id, service, can_read, can_write)
  VALUES 
    (target_user_id, 'gcp', true, true),
    (target_user_id, 'aws', true, true),
    (target_user_id, 'hetzner', true, true),
    (target_user_id, 'jira', true, true),
    (target_user_id, 'bitbucket', true, true)
  ON CONFLICT (user_id, service) 
  DO UPDATE SET can_read = true, can_write = true;

  INSERT INTO kanban_permissions (user_id, can_read, can_write)
  VALUES (target_user_id, true, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET can_read = true, can_write = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to setup a complete admin user
CREATE OR REPLACE FUNCTION setup_admin_user(user_email text)
RETURNS void AS $$
BEGIN
  PERFORM grant_admin_role(user_email);
  PERFORM grant_all_permissions(user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
