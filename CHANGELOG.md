# Changelog - Authentication & Permissions System

## Summary

Added a complete authentication and role-based access control system to the Billing Tracker application using Supabase.

## Database Changes

### New Tables

1. **user_profiles**
   - Stores user information and roles
   - Linked to Supabase auth.users
   - Automatically created via trigger on signup
   - RLS enabled with user and admin policies

2. **service_permissions**
   - Granular read/write permissions per service
   - Supports: gcp, aws, hetzner, jira, bitbucket
   - RLS enabled with user and admin policies
   - Unique constraint on (user_id, service)

3. **kanban_permissions**
   - Separate read/write permissions for kanban
   - One row per user
   - RLS enabled with user and admin policies

4. **todos** (migrated to Supabase)
   - Moved from MongoDB to Supabase
   - Added user tracking fields:
     - `created_by` - task creator
     - `assigned_to_user` - current assignee
     - `assigned_by` - who assigned the task
     - `assigned_at` - timestamp of assignment
   - RLS enabled with visibility rules
   - Users only see tasks they're involved with

### Migrations Applied

1. `create_todos_table.sql` - Initial todos table in Supabase
2. `create_auth_and_permissions_system.sql` - Auth infrastructure
3. `add_helper_functions.sql` - User management utilities

### Helper Functions

- `grant_admin_role(email)` - Promote user to admin
- `grant_all_permissions(email)` - Grant full access
- `setup_admin_user(email)` - Complete admin setup

## Frontend Changes

### New Pages

1. **login.html**
   - Login/signup form with tabs
   - Email/password authentication
   - Clean, modern design
   - Auto-redirect if already logged in

2. **admin.html**
   - User management interface
   - Permission editing
   - Role assignment
   - Real-time permission display

### New JavaScript Modules

1. **js/auth.js**
   - Supabase client initialization
   - Authentication functions
   - Permission checking utilities
   - User session management
   - UI updates for auth state

2. **js/admin.js**
   - Admin panel logic
   - User loading and display
   - Permission editing modal
   - Bulk permission updates

### Updated Pages

1. **index.html**
   - Added auth script
   - User info display in nav
   - Permission-based navigation filtering
   - Admin panel link for admins
   - Requires authentication to access

2. **kanban.html**
   - Updated to use Supabase
   - User dropdown for task assignment
   - Assignment tracking display
   - Permission checks for edit/delete
   - Shows assignment timestamps

### Updated JavaScript Modules

1. **js/kanban.js**
   - Complete rewrite for Supabase
   - User loading and selection
   - Assignment tracking
   - Permission-based actions
   - Task visibility filtering

## Security Features

### Row Level Security (RLS)

All tables have comprehensive RLS policies:

- Users can only access their own data
- Admins have full access
- Task visibility based on involvement
- Permission checks at database level
- Prevents unauthorized access

### Authentication Flow

- Secure email/password authentication
- Automatic profile creation on signup
- Permission loading on login
- Session management with Supabase
- Auto-redirect for protected pages

### Permission Enforcement

Multiple layers of security:
1. Database RLS policies (primary)
2. UI visibility controls
3. Frontend permission checks
4. Backend validation (for legacy APIs)

## Features Added

### User Management

- Admin can view all users
- Edit roles (Admin, Manager, User)
- Manage service permissions
- Manage kanban permissions
- Real-time permission updates

### Task Assignment

- Assign tasks to team members
- Track who assigned the task
- Record assignment timestamp
- Display assignment info on cards
- Filter tasks by involvement

### Navigation Filtering

- Services hidden without permission
- Kanban hidden without permission
- Admin panel only for admins
- Dynamic based on user role
- Logout button in navigation

### Permission Granularity

Per-service permissions:
- GCP (read/write)
- AWS (read/write)
- Hetzner (read/write)
- Jira (read/write)
- Bitbucket (read/write)

Kanban permissions:
- Read (view tasks)
- Write (create/edit/delete tasks)

## Files Added

### Documentation
- `SETUP.md` - Setup and configuration guide
- `AUTH_README.md` - Complete authentication documentation
- `CHANGELOG.md` - This file
- `setup-admin.sql` - SQL script for admin setup

### Frontend
- `frontend/login.html` - Login/signup page
- `frontend/admin.html` - Admin panel
- `frontend/js/auth.js` - Authentication module
- `frontend/js/admin.js` - Admin panel logic
- `frontend/.env.example` - Environment template

### Database
- Multiple migration files (applied via Supabase)

## Files Modified

### Frontend
- `frontend/index.html` - Added auth, user info, nav filtering
- `frontend/kanban.html` - Updated for Supabase, assignment UI
- `frontend/js/kanban.js` - Complete rewrite for Supabase
- `frontend/css/style.css` - No changes (existing styles work)

### Backend
- No backend changes (MongoDB routes still work for billing/checklist/instance)
- Todo routes now deprecated (replaced by Supabase)

## Breaking Changes

### API Changes

The following MongoDB API routes are deprecated and no longer used:
- `POST /api/todo` - Use Supabase client
- `GET /api/todo` - Use Supabase client
- `GET /api/todo/:id` - Use Supabase client
- `PATCH /api/todo/:id` - Use Supabase client
- `DELETE /api/todo/:id` - Use Supabase client

### Data Migration

If you have existing todos in MongoDB, they need to be manually migrated to Supabase. The schema has changed to include user tracking fields.

### Schema Changes

Todos table now requires:
- `created_by` (user ID) - required
- User must have kanban permissions to create tasks
- RLS policies enforce task visibility

## Upgrade Path

### For New Installations

1. Run all Supabase migrations
2. Sign up first user
3. Run `setup_admin_user('email')` SQL
4. Access admin panel
5. Create additional users
6. Assign permissions

### For Existing Installations

1. Apply all Supabase migrations
2. Sign up with existing admin email
3. Run `setup_admin_user('email')` SQL
4. Migrate MongoDB todos to Supabase (manual)
5. Update user references in todos
6. Test permissions

## Configuration

### Required Environment Variables

Frontend needs:
- `SUPABASE_URL` (or default to local)
- `SUPABASE_ANON_KEY` (or default to local)

Can be set via:
- `window.ENV` object
- Direct modification in `js/auth.js`

### Supabase Configuration

Required:
- Auth enabled with email/password
- RLS enabled on all tables
- Migrations applied
- Helper functions created

## Testing

### Test Scenarios

1. **Sign Up**
   - New user can sign up
   - Profile automatically created
   - Default role is 'user'

2. **Admin Access**
   - Admin can access admin panel
   - Admin can view all users
   - Admin can edit permissions

3. **Permissions**
   - User without service access can't see service
   - User without kanban access can't see kanban
   - Permissions persist after logout/login

4. **Task Management**
   - User can create task (with permission)
   - User can assign task to others
   - Assignee can see task
   - Creator can delete task
   - Assignment info displays correctly

5. **Security**
   - RLS prevents unauthorized access
   - Non-admins can't access admin panel
   - Users can't see others' tasks (unless involved)

## Performance Considerations

### Database
- RLS policies add minimal overhead
- Indexes on user_id columns
- Efficient permission queries
- Cached permission data in frontend

### Frontend
- Permissions loaded once per session
- Navigation filtering happens client-side
- Minimal Supabase API calls
- Real-time updates via Supabase subscriptions (future)

## Known Limitations

1. **No Email Verification**
   - Users can sign up without email verification
   - Can be added via Supabase settings

2. **No Password Reset**
   - Password reset not implemented
   - Can be added with Supabase Auth

3. **No Audit Log**
   - Permission changes not logged
   - Can be added with triggers

4. **No Team Management**
   - No team/group concept
   - Permissions are per-user only

5. **Legacy MongoDB**
   - Billing, checklist, and instance still use MongoDB
   - Could be migrated to Supabase

## Future Enhancements

- Email verification on signup
- Password reset flow
- Two-factor authentication
- Audit log for permission changes
- Team/group-based permissions
- Permission templates
- Bulk user management
- Time-based access grants
- Migrate remaining MongoDB collections

## Migration Guide

### From MongoDB Todos to Supabase

```sql
-- Example: Insert old todos with default creator
INSERT INTO todos (title, description, status, priority, tags, due_date, created_by)
SELECT
  title,
  description,
  status,
  priority,
  tags,
  due_date,
  'your-user-id-here' -- Replace with actual user ID
FROM old_todos_table;
```

## Support

For issues:
1. Check documentation (SETUP.md, AUTH_README.md)
2. Review Supabase logs
3. Check browser console
4. Verify migrations applied
5. Test SQL queries directly

## Contributors

- Initial implementation: Claude (AI Assistant)
- Database design: Claude
- Frontend development: Claude
- Documentation: Claude
