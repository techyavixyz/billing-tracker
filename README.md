# Billing Tracker

A comprehensive cloud billing management system with task management capabilities.

## Features

- **Multi-Cloud Billing Tracking**: Track costs across GCP, AWS, Hetzner, Jira, and Bitbucket
- **Cost Analytics**: Visualize spending trends with interactive charts
- **Data Export**: Export billing data to CSV and Excel with charts
- **Instance Calculator**: Calculate average CPU and RAM usage
- **Daily Checklist**: Manage operational tasks and checklists
- **Kanban Board**: Visual task management with assignment tracking

## Quick Start

### Prerequisites
- Node.js and npm
- MongoDB

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

3. Configure environment variables
```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit backend/.env to customize your configuration
# The file comes with sensible defaults for development
```

**Default Admin Credentials:**
- Username: `admin`
- Email: `admin@billingtracker.local`
- Password: `admin123`

The default admin account is created automatically on first startup if no users exist in the database.

4. Start MongoDB
```bash
# Make sure MongoDB is running on localhost:27017
```

5. Start the application
```bash
cd backend
npm start
```

6. Access the application and login
```
http://localhost:4000
```
Login with the default credentials above.

## Configuration

### Environment Variables

The application uses environment variables configured in `backend/.env`:

```env
# MongoDB Configuration
MONGO_URI=mongodb://root:secret123@localhost:27017/billing-tracker?authSource=admin

# JWT Secret (change this in production!)
JWT_SECRET=your-secret-key-change-in-production

# Default Admin Credentials
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@billingtracker.local
DEFAULT_ADMIN_PASSWORD=admin123

# Server Configuration
PORT=4000
```

**Security Note:** Change the default credentials and JWT secret in production environments!

## Architecture

### Frontend
- Pure HTML, CSS, JavaScript
- Chart.js for data visualization
- Responsive design

### Backend
- Express.js server
- MongoDB for all data storage
- RESTful API endpoints
- JWT-based authentication

### Database
- **MongoDB**: Billing records, daily checklists, instance calculations, tasks, user accounts

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account (only available on first deployment)
- `POST /api/auth/login` - Login with username/email and password
- `GET /api/auth/check-signup-available` - Check if signup is available

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

### Tasks
- `POST /api/todo` - Create a new task
- `GET /api/todo` - Get all tasks
- `GET /api/todo/:id` - Get a single task
- `PATCH /api/todo/:id` - Update a task
- `DELETE /api/todo/:id` - Delete a task

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
│   │   └── Todo.js
│   ├── routes/
│   │   ├── billing.routes.js
│   │   ├── checklist.routes.js
│   │   ├── instance.routes.js
│   │   └── todo.routes.js
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js
│   │   ├── billing.js
│   │   ├── checklist.js
│   │   ├── instance.js
│   │   └── kanban.js
│   ├── add-billing.html
│   ├── checklist.html
│   ├── index.html
│   ├── instance.html
│   ├── kanban.html
│   └── service.html
└── README.md
```

### Adding New Features

1. **Frontend**: Add new HTML page and JavaScript module
2. **Backend**: Create new route handler
3. **Database**: Create MongoDB model if needed
4. **Documentation**: Update README

## Troubleshooting

### Default credentials not working
- Check the `backend/.env` file for the current credentials
- Ensure MongoDB is properly connected
- The default user is only created if no users exist in the database

### MongoDB connection failed
- Ensure MongoDB is running
- Check connection string in `backend/.env` (MONGO_URI)
- Verify credentials if using authentication

### Application won't start
- Check if port 4000 is already in use (or change PORT in .env)
- Verify all npm dependencies are installed with `npm install`
- Check for errors in the console

### How to change admin password
The application currently doesn't have a password change interface. To change the admin password:
1. Delete the existing user from MongoDB
2. Update the credentials in `backend/.env`
3. Restart the application to create a new user with updated credentials

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Express.js](https://expressjs.com/) - Backend framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [ExcelJS](https://github.com/exceljs/exceljs) - Excel export
