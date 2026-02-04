# Billing Tracker

A comprehensive cloud billing management system with authentication, role-based permissions, and task management capabilities.

## Features

### Core Features
- **Multi-Cloud Billing Tracking**: Track costs across GCP, AWS, Hetzner, Jira, and Bitbucket
- **Cost Analytics**: Visualize spending trends with interactive charts
- **Data Export**: Export billing data to CSV and Excel with charts
- **Instance Calculator**: Calculate average CPU and RAM usage
- **Daily Checklist**: Manage operational tasks and checklists
- **Kanban Board**: Visual task management with assignment tracking

### Authentication & Security
- **User Authentication**: Secure email/password login via Supabase
- **Role-Based Access Control (RBAC)**: Admin, Manager, and User roles
- **Granular Permissions**: Per-service and per-feature access control
- **Row Level Security**: Database-level security with Supabase RLS
- **Admin Panel**: Comprehensive user and permission management

### Task Management
- **Task Assignment**: Assign tasks to team members
- **Assignment Tracking**: Track who assigned tasks and when
- **Task Visibility**: Users only see relevant tasks
- **Real-time Updates**: Changes reflect immediately

## Quick Start

### Prerequisites
- Node.js and npm
- MongoDB (for billing, checklist, instance data)
- Supabase account (for authentication and task management)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd billing-tracker
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Configure Supabase
- Create a Supabase project
- Apply migrations from the Supabase dashboard SQL editor
- Update `frontend/js/auth.js` with your Supabase credentials

4. Start MongoDB
```bash
# Make sure MongoDB is running on localhost:27017
```

5. Start the application
```bash
cd backend
npm start
```

6. Access the application
```
http://localhost:4000
```

### Initial Setup

1. **Create Admin User**
   - Navigate to `http://localhost:4000/login.html`
   - Sign up with your email and password
   - Run this SQL in Supabase SQL Editor:
   ```sql
   SELECT setup_admin_user('your-email@example.com');
   ```

2. **Access Admin Panel**
   - Login to the application
   - Click "Admin" in the navigation
   - Manage users and permissions

## Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup and configuration guide
- **[AUTH_README.md](AUTH_README.md)** - Complete authentication documentation
- **[CHANGELOG.md](CHANGELOG.md)** - List of changes and features added
- **[setup-admin.sql](setup-admin.sql)** - SQL script for admin setup

## Architecture

### Frontend
- Pure HTML, CSS, JavaScript
- Chart.js for data visualization
- Supabase JS client for authentication and database
- Responsive design

### Backend
- Express.js server
- MongoDB for billing, checklist, and instance data
- Supabase for authentication and task management
- RESTful API endpoints

### Database
- **MongoDB**: Billing records, daily checklists, instance calculations
- **Supabase**: User profiles, permissions, tasks (todos)

## User Roles

### Admin
- Full access to all features
- Manage users and permissions
- View and manage all tasks
- Access admin panel

### Manager
- Custom permissions set by admin
- Can have access to specific services
- Can have kanban access

### User
- Custom permissions set by admin
- Limited to granted services
- Can only see own tasks

## Permissions

### Service Permissions
Each service has separate read/write permissions:
- **GCP**: Google Cloud Platform billing
- **AWS**: Amazon Web Services billing
- **Hetzner**: Hetzner Cloud billing
- **Jira**: Atlassian Jira billing
- **Bitbucket**: Atlassian Bitbucket billing

### Feature Permissions
- **Kanban Read**: View tasks and kanban board
- **Kanban Write**: Create, edit, delete, and assign tasks

## API Endpoints

### Billing
- `POST /api/billing/add` - Add billing data
- `GET /api/billing?service={service}&range={daily|monthly}` - Get aggregated data
- `GET /api/billing/raw` - Get raw billing records
- `GET /api/billing/export-csv` - Export to CSV
- `GET /api/billing/export-excel` - Export to Excel with chart

### Checklist
- `GET /api/checklist/areas` - Get all areas
- `POST /api/checklist/add` - Add new task
- `GET /api/checklist` - Get tasks (with filters)
- `PATCH /api/checklist/:id` - Update task status
- `DELETE /api/checklist/:id` - Delete task
- `GET /api/checklist/export-csv` - Export to CSV

### Instance Calculator
- `POST /api/instance/calculate` - Calculate instance averages

### Tasks (Supabase Direct)
Tasks are managed directly via Supabase client in the frontend. Legacy `/api/todo/*` endpoints are deprecated.

## Security

### Row Level Security (RLS)
All Supabase tables have RLS policies that:
- Ensure users only access their own data
- Allow admins full access
- Enforce permissions at database level
- Prevent unauthorized access

### Authentication
- Secure password hashing (handled by Supabase)
- Session management with JWT tokens
- Protected routes requiring authentication
- Automatic session refresh

### Data Privacy
- Users can only see their own tasks
- Service access controlled by permissions
- Admin actions logged (future enhancement)

## Development

### Project Structure
```
billing-tracker/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── BillingRecord.js
│   │   ├── DailyChecklist.js
│   │   └── Todo.js (deprecated)
│   ├── routes/
│   │   ├── billing.routes.js
│   │   ├── checklist.routes.js
│   │   ├── instance.routes.js
│   │   └── todo.routes.js (deprecated)
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── billing.js
│   │   ├── checklist.js
│   │   ├── instance.js
│   │   └── kanban.js
│   ├── add-billing.html
│   ├── admin.html
│   ├── checklist.html
│   ├── index.html
│   ├── instance.html
│   ├── kanban.html
│   ├── login.html
│   └── service.html
├── AUTH_README.md
├── CHANGELOG.md
├── README.md
├── SETUP.md
└── setup-admin.sql
```

### Adding New Features

1. **Frontend**: Add new HTML page and JavaScript module
2. **Backend**: Create new route handler
3. **Permissions**: Add permission checks in frontend and backend
4. **Database**: Create Supabase migration if needed
5. **Documentation**: Update README and relevant docs

## Troubleshooting

### User can't login
- Verify Supabase credentials are correct
- Check Supabase auth is enabled
- Verify email/password in Supabase dashboard

### Permissions not working
- Check user role in admin panel
- Verify permissions are granted
- Try logout and login again
- Check browser console for errors

### Tasks not visible
- Verify user has kanban read permission
- Check user is involved with the task (creator, assignee, or assigner)
- Verify RLS policies are enabled

### MongoDB connection failed
- Ensure MongoDB is running
- Check connection string in `backend/config/db.js`
- Verify credentials if using authentication

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
1. Check the documentation
2. Review Supabase logs
3. Check browser console
4. Verify configuration
5. Open an issue on GitHub

## Roadmap

- [ ] Email verification
- [ ] Password reset
- [ ] Two-factor authentication
- [ ] Audit log
- [ ] Team management
- [ ] Permission templates
- [ ] Migrate all data to Supabase
- [ ] Real-time notifications
- [ ] Mobile app
- [ ] API rate limiting

## Credits

Built with:
- [Express.js](https://expressjs.com/) - Backend framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Supabase](https://supabase.com/) - Authentication and database
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [ExcelJS](https://github.com/exceljs/exceljs) - Excel export
