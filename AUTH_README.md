# Authentication & Permissions System

## Overview

The Billing Tracker now includes a comprehensive authentication and role-based access control (RBAC) system powered by Supabase. This system provides:

- Secure user authentication
- Granular permission management
- Service-level access control
- Kanban board permissions
- Task assignment tracking with timestamps
- User-filtered task visibility

## Quick Start

### 1. Sign Up

Visit `http://localhost:4000/login.html` and create an account.

### 2. Become Admin (First User)

After signing up, run this SQL in your Supabase SQL Editor:

```sql
SELECT setup_admin_user('your-email@example.com');
```

Or use the provided script:
```bash
# Edit setup-admin.sql with your email, then run it in Supabase SQL Editor
```

### 3. Access Admin Panel

- Login to the application
- Navigate to the Admin panel from the navigation menu
- Manage users and permissions

## User Roles

### Admin
- Full access to all services and features
- Can manage all users and their permissions
- Access to admin panel
- Can view and manage all tasks
- Bypasses all permission checks

### Manager
- Custom permissions assigned by admin
- Can have read/write access to specific services
- Can have kanban board access

### User
- Custom permissions assigned by admin
- Limited to granted services only
- Can only see their own tasks (created, assigned to, or assigned by them)

## Permissions System

### Service Permissions

Each service (GCP, AWS, Hetzner, Jira, Bitbucket) has two permission levels:

- **Read**: View billing data, export reports
- **Write**: Add new billing entries, modify data

### Kanban Permissions

The kanban board has separate permissions:

- **Read**: View the kanban board and tasks
- **Write**: Create, edit, delete, and assign tasks

### Permission Enforcement

Permissions are enforced at multiple levels:

1. **Database Level**: Row Level Security (RLS) policies
2. **UI Level**: Navigation items are hidden based on permissions
3. **API Level**: Backend validates permissions (for MongoDB routes)
4. **Supabase Level**: Direct queries respect RLS policies

## Task Management

### Task Visibility Rules

Users can see tasks where they are:
- The creator (created_by)
- Assigned to (assigned_to_user)
- The assigner (assigned_by)
- An admin (sees all tasks)

### Task Assignment

When assigning a task, the system records:
- **assigned_to_user**: User ID of the assignee
- **assigned_by**: User ID of the person who made the assignment
- **assigned_at**: Timestamp of the assignment

This data is displayed on each task card:
```
Assigned to: John Doe
Assigned by Jane Smith on 2/3/2026, 10:30:00 AM
```

### Task Workflow

1. User creates a task (must have kanban write permission)
2. User can assign task to another user
3. Both creator and assignee can see the task
4. Task shows assignment details and timestamps
5. Only creator or admin can delete the task

## Admin Panel Features

### User Management

View all users with their:
- Name and email
- Current role
- Service permissions (shown as R/W/RW/-)
- Kanban permissions

### Edit Permissions

Click "Edit" on any user to:
1. Change their role (Admin/Manager/User)
2. Enable/disable service permissions
3. Set read and/or write access per service
4. Enable/disable kanban access
5. Save all changes at once

### Permission Legend

- **R**: Read only
- **W**: Write only
- **RW**: Read and Write
- **-**: No access

## Security Features

### Row Level Security (RLS)

All tables use RLS policies:

**user_profiles**:
- Users can view and update their own profile
- Admins can view and update all profiles

**service_permissions**:
- Users can view their own permissions
- Admins can manage all permissions

**kanban_permissions**:
- Users can view their own permissions
- Admins can manage all permissions

**todos**:
- Users can view tasks they're involved with
- Users can create tasks (if they have kanban write permission)
- Users can update/delete their own tasks
- Admins can manage all tasks

### Authentication Flow

```
┌─────────────┐
│  User       │
└──────┬──────┘
       │
       ├─► Sign Up / Login (Supabase Auth)
       │
       ├─► Profile Created (Trigger)
       │
       ├─► Permissions Loaded
       │
       ├─► Navigation Filtered
       │
       └─► Access Granted to Allowed Features
```

## Database Schema

### user_profiles
- id (uuid) - references auth.users
- email (text)
- full_name (text)
- role (text) - admin/manager/user
- created_at, updated_at

### service_permissions
- id (uuid)
- user_id (uuid) - references user_profiles
- service (text) - gcp/aws/hetzner/jira/bitbucket
- can_read (boolean)
- can_write (boolean)
- created_at

### kanban_permissions
- id (uuid)
- user_id (uuid) - references user_profiles
- can_read (boolean)
- can_write (boolean)
- created_at

### todos (updated)
- id (uuid)
- title, description, status, priority, tags
- due_date
- created_by (uuid) - task creator
- assigned_to_user (uuid) - current assignee
- assigned_by (uuid) - who assigned it
- assigned_at (timestamp) - when assigned
- created_at, updated_at

## Frontend Architecture

### Authentication Module (auth.js)

Provides:
- `initAuth()` - Initialize auth and load user data
- `requireAuth()` - Protect pages requiring login
- `isAdmin()` - Check if user is admin
- `hasServiceAccess(service, accessType)` - Check service permissions
- `hasKanbanAccess(accessType)` - Check kanban permissions
- `signIn()`, `signUp()`, `signOut()` - Auth operations
- `getUserProfile()`, `getUserPermissions()` - Get current user data

### Page Protection

Each page calls `requireAuth()` on load:

```javascript
(async () => {
  await requireAuth();
  // Page-specific code
})();
```

### Permission Checks

Check permissions before rendering:

```javascript
if (hasServiceAccess('gcp', 'read')) {
  // Show GCP data
}

if (hasKanbanAccess('write')) {
  // Show task creation button
}
```

## API Integration

### Supabase Client

Frontend uses Supabase JavaScript client:

```javascript
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Direct Queries

Tasks are managed directly through Supabase:

```javascript
// Create task
const { error } = await supabase
  .from('todos')
  .insert([taskData]);

// Load tasks (RLS automatically filters)
const { data } = await supabase
  .from('todos')
  .select('*');
```

RLS policies ensure users only see allowed data.

## Troubleshooting

### Problem: User can't see any services

**Solution**:
1. Check user role in admin panel
2. Ensure service permissions are enabled
3. Verify user is logged in
4. Check browser console for errors

### Problem: User can't create tasks

**Solution**:
1. Verify user has kanban write permission
2. Check user is properly authenticated
3. Ensure RLS policies are enabled
4. Check Supabase logs for policy errors

### Problem: Task not visible to assignee

**Solution**:
1. Verify task was actually assigned (assigned_to_user is set)
2. Check assignee has kanban read permission
3. Confirm RLS policies are active
4. Verify user IDs match correctly

### Problem: Permission changes not taking effect

**Solution**:
1. Have user logout and login again
2. Clear browser cache
3. Verify changes were saved in database
4. Check for JavaScript errors in console

## Best Practices

### For Admins

1. **Start with minimal permissions** and add as needed
2. **Use Manager role** for team leads who need broad access
3. **Regular audits** of user permissions
4. **Test permissions** by logging in as different users
5. **Document** special permission setups

### For Developers

1. **Always check permissions** before rendering sensitive UI
2. **Use RLS policies** as the primary security layer
3. **Never trust client-side** permission checks alone
4. **Log permission errors** for debugging
5. **Test with multiple user roles** during development

## Support

For issues or questions:
1. Check this documentation
2. Review Supabase logs for RLS policy errors
3. Check browser console for JavaScript errors
4. Verify database schema matches migrations
5. Test with SQL queries directly in Supabase

## Future Enhancements

Potential improvements:
- Email verification on signup
- Password reset functionality
- Two-factor authentication
- Audit log for permission changes
- Bulk permission management
- Permission templates/presets
- Team-based permissions
- Time-based access grants
