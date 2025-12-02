# MyMusicCity - Installation Instructions

## Prerequisites

Before installing MyMusicCity, ensure you have the following software installed:

- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)
- **MongoDB** account (for database) - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Auth0** account (for authentication) - [Auth0](https://auth0.com/)

## System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 1GB free disk space
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/MyMusicCity/MyMusicCity.git
cd MyMusicCity
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Client Dependencies

```bash
cd client
npm install
cd ..
```

### 4. Install Server Dependencies

```bash
cd server
npm install
cd ..
```

### 5. Environment Configuration

#### Client Environment Variables
Create `client/.env` file:

```env
# Auth0 Configuration
REACT_APP_AUTH0_DOMAIN=your-auth0-domain.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your-auth0-client-id
REACT_APP_AUTH0_AUDIENCE=your-auth0-audience

# API Configuration
REACT_APP_API_URL=http://localhost:5000

# Email restrictions (set to false for open access)
REACT_APP_ENFORCE_VANDERBILT_EMAIL=false

# Development server configuration
PORT=3000
```

#### Server Environment Variables
Create `server/.env` file:

```env
# Database Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-auth0-audience

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend Configuration
CORS_ORIGIN=http://localhost:3000

# JWT Configuration (for local auth fallback)
JWT_SECRET=your-jwt-secret-key
```

### 6. Database Setup

1. **Create MongoDB Atlas Account**:
   - Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Create a database user
   - Whitelist your IP address

2. **Get Connection String**:
   - In Atlas dashboard, click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Update `MONGO_URI` in server `.env` file

### 7. Auth0 Setup

1. **Create Auth0 Account**:
   - Visit [Auth0](https://auth0.com/)
   - Create a free account
   - Create a new application (Single Page Application)

2. **Configure Application**:
   - Set **Allowed Callback URLs**: `http://localhost:3000`
   - Set **Allowed Logout URLs**: `http://localhost:3000`
   - Set **Allowed Web Origins**: `http://localhost:3000`

3. **Create API**:
   - Go to APIs section in Auth0 Dashboard
   - Create new API
   - Set identifier (use as `AUTH0_AUDIENCE`)

4. **Update Environment Variables**:
   - Copy Domain and Client ID to client `.env`
   - Copy Domain and API Identifier to server `.env`

## Running the Application

### Development Mode

1. **Start the Backend Server**:
```bash
# From root directory
npm run dev
# OR
cd server && npm run dev
```

2. **Start the Frontend** (in new terminal):
```bash
cd client
npm start
```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Production Mode

1. **Build the Frontend**:
```bash
cd client
npm run build
```

2. **Start Production Server**:
```bash
# From root directory
npm start
```

## Testing the Installation

### 1. Verify Backend
Visit http://localhost:5000 - should show "Hello from MyMusicCity backend!"

### 2. Verify Database Connection
Check server logs for "✅ Connected to MongoDB"

### 3. Verify Frontend
Visit http://localhost:3000 - should load the MyMusicCity homepage

### 4. Test Authentication
Click "Login" button - should redirect to Auth0 login page

### 5. Test API Endpoints
- GET http://localhost:5000/api/events - should return events data
- GET http://localhost:5000/healthz - should return `{"ok": true}`

## Common Installation Issues

### Node.js Version Conflicts
```bash
# Check Node.js version
node --version
# Should be v18.0.0 or higher

# If using nvm (Node Version Manager)
nvm install 18
nvm use 18
```

### Port Already in Use
```bash
# Find and kill process using port 3000 or 5000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux  
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Issues
- Verify connection string format
- Check IP whitelist in MongoDB Atlas
- Ensure database user has proper permissions

### Auth0 Configuration Issues
- Verify callback URLs match exactly
- Check domain and client ID are correct
- Ensure API audience is configured

### Dependencies Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## File Structure After Installation

```
MyMusicCity/
├── client/                 # React frontend
│   ├── node_modules/      # Frontend dependencies
│   ├── public/            # Static assets
│   ├── src/               # React source code
│   ├── .env               # Client environment variables
│   └── package.json       # Client dependencies
├── server/                # Node.js backend
│   ├── node_modules/      # Backend dependencies
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── .env               # Server environment variables
│   └── package.json       # Server dependencies
├── node_modules/          # Root dependencies
├── package.json           # Root package configuration
└── README.md              # Project documentation
```

## Next Steps

After successful installation:
1. Review the [Deployment Instructions](DEPLOYMENT.md)
2. Run tests: `npm test`
3. Explore the API documentation in the README
4. Start developing or customizing features

## Support

For installation issues:
1. Check the troubleshooting section above
2. Review error logs in terminal
3. Verify all environment variables are set correctly
4. Ensure all prerequisites are installed and up to date