-- Setup Admin User Script
-- Run this in Supabase SQL Editor after signing up through the UI

-- Step 1: Replace 'admin@example.com' with your actual admin email address
-- Step 2: Run this entire script in the Supabase SQL Editor

-- Example: Setup admin user
SELECT setup_admin_user('admin@example.com');

-- Verify the user was set up correctly
SELECT
  up.email,
  up.full_name,
  up.role,
  (SELECT COUNT(*) FROM service_permissions WHERE user_id = up.id) as service_perms_count,
  (SELECT can_read FROM kanban_permissions WHERE user_id = up.id) as kanban_read,
  (SELECT can_write FROM kanban_permissions WHERE user_id = up.id) as kanban_write
FROM user_profiles up
WHERE up.email = 'admin@example.com';

-- If you want to add more users with full permissions:
-- SELECT setup_admin_user('another-admin@example.com');

-- If you want to grant just admin role without permissions:
-- SELECT grant_admin_role('user@example.com');

-- If you want to grant all permissions without admin role:
-- SELECT grant_all_permissions('user@example.com');
