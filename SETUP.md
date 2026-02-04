# Billing Tracker - Authentication & Permissions Setup Guide

This application now includes a complete authentication system with role-based access control (RBAC) using Supabase.

## Features

- **User Authentication**: Email/password login and signup
- **Role-Based Access Control**: Admin, Manager, and User roles
- **Service-Level Permissions**: Granular read/write access for each service (GCP, AWS, Hetzner, Jira, Bitbucket)
- **Kanban Permissions**: Separate read/write access for the kanban board
- **Task Assignment Tracking**: Tracks who assigned tasks and when
- **User-Filtered Tasks**: Users only see tasks they created, are assigned to, or have assigned to others

## Database Structure

### Tables Created

1. **user_profiles** - Extended user information with roles
2. **service_permissions** - Service-level access control per user
3. **kanban_permissions** - Kanban board access control per user
4. **todos** - Tasks with assignment tracking (updated schema)

### Permissions Model

- **Admin**: Full access to everything, can manage all users and permissions
- **Manager**: Custom permissions set by admin
- **User**: Custom permissions set by admin

## Initial Setup

### 1. Supabase Configuration

The migrations have already been applied. Your Supabase database now includes:
- Authentication system with RLS (Row Level Security)
- User profile management
- Permission tables
- Task management with assignment tracking

### 2. Create Admin User

To create the first admin user, you have two options:

#### Option A: Sign up through the UI and manually promote to admin

1. Go to `http://localhost:4000/login.html`
2. Sign up with your email and password
3. In the Supabase dashboard, go to Table Editor > user_profiles
4. Find your user and change the `role` column from `user` to `admin`
5. Add permissions manually in the service_permissions and kanban_permissions tables

#### Option B: Use Supabase SQL Editor

Run this SQL in your Supabase SQL Editor (replace the email and password):

```sql
-- Create admin user (you'll need to get the UUID after signup)
-- First, sign up through the UI, then run this to promote to admin:

UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';

-- The admin doesn't need explicit permissions as they have full access by default
```

### 3. Configure Frontend Environment

The frontend uses the Supabase client. Make sure you have your Supabase credentials:

In `frontend/js/auth.js`, the default configuration connects to your local Supabase instance. If you're using a hosted Supabase project, update:

```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```

Or use `window.ENV` to inject these values dynamically.

## User Management

### Admin Panel

Admins can access the admin panel at `/admin.html` to:
- View all users
- Assign roles (Admin, Manager, User)
- Grant/revoke service permissions (Read/Write for each service)
- Grant/revoke kanban permissions (Read/Write)

### Permission Types

**Service Permissions** (per service):
- **Read**: Can view billing data for the service
- **Write**: Can add/edit billing data for the service

**Kanban Permissions**:
- **Read**: Can view the kanban board and tasks
- **Write**: Can create, edit, and delete tasks

### Role Hierarchy

1. **Admin**
   - Full access to everything
   - Can manage all users and permissions
   - Can access admin panel
   - Bypasses all permission checks

2. **Manager**
   - Custom permissions set by admin
   - Can be given read/write access to specific services
   - Can be given kanban access

3. **User**
   - Custom permissions set by admin
   - Limited access based on granted permissions
   - Can only manage their own profile

## Kanban Task Visibility

Users can see tasks where they are:
- The creator (`created_by`)
- Assigned to the task (`assigned_to_user`)
- The one who assigned the task (`assigned_by`)
- An admin (can see all tasks)

### Task Assignment

When a user assigns a task to another user, the system records:
- `assigned_to_user`: The user receiving the task
- `assigned_by`: The user who made the assignment
- `assigned_at`: Timestamp of when the assignment was made

This information is displayed on the kanban card for full transparency.

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Ensure users can only access their own data
- Allow admins full access
- Enforce permission checks at the database level
- Prevent unauthorized data access

### Authentication Flow

1. User signs up or logs in via `/login.html`
2. Supabase Auth creates the user account
3. A trigger automatically creates a user profile
4. User is redirected to the dashboard
5. Permissions are loaded and navigation is filtered
6. Each page checks permissions before displaying content

## Usage Guide

### For Admins

1. **Login** as admin
2. **Navigate to Admin Panel** from the navigation menu
3. **Manage Users**:
   - View all users and their current permissions
   - Click "Edit" on any user
   - Set their role (Admin, Manager, User)
   - Enable/disable service permissions (Read/Write)
   - Enable/disable kanban permissions (Read/Write)
   - Click "Save Permissions"

### For Regular Users

1. **Login** with your credentials
2. **Dashboard** shows only the services you have access to
3. **Service Pages** are only visible if you have read permission
4. **Kanban Board** is only visible if you have kanban read permission
5. **Create/Edit Tasks** requires kanban write permission
6. **View Your Tasks**:
   - Tasks you created
   - Tasks assigned to you
   - Tasks you assigned to others

### Creating a New User

1. Admin creates user through signup page OR user self-registers
2. Admin navigates to admin panel
3. Admin finds the new user and clicks "Edit"
4. Admin assigns appropriate role and permissions
5. User can now access granted services and features

## API Endpoints (Legacy MongoDB - No Longer Used)

The following API endpoints are deprecated as the application now uses Supabase directly:
- `/api/todo/*` - Replaced with Supabase client calls
- MongoDB connection is no longer required for todos

The billing, checklist, and instance endpoints still use MongoDB.

## Troubleshooting

### User Can't See Services

- Check user has the correct role in admin panel
- Verify service permissions are enabled (Read access minimum)
- Ensure user is logged in

### User Can't Access Kanban

- Check kanban permissions in admin panel
- User needs at least "Can Read Kanban" enabled
- Verify user is authenticated

### Task Not Visible

- Users only see tasks they're involved with
- Check if user is creator, assignee, or assigner
- Admins can see all tasks

### Permission Changes Not Taking Effect

- User may need to refresh the page or logout/login
- Check browser console for any errors
- Verify RLS policies are enabled in Supabase

## Next Steps

1. Create your admin account
2. Test login and permissions
3. Create additional users via signup
4. Use admin panel to grant permissions
5. Test kanban board with multiple users
6. Assign tasks and verify visibility

## Technical Notes

- Frontend uses Supabase JavaScript client
- RLS policies enforce security at database level
- Permissions are loaded on page load and cached
- Admin role bypasses permission checks
- All sensitive operations require authentication
