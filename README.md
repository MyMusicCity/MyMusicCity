# MyMusicCity 🎵

A modern web application for discovering and managing music events in Nashville, built with React, Node.js, and MongoDB.

## 🎯 Project Overview

MyMusicCity is a comprehensive event management platform that allows users to:
- Discover upcoming music events in Nashville
- RSVP to events and manage attendance
- Comment and interact with other attendees  
- View event details, venues, and dates
- Authenticate securely with Auth0

## 🚀 Features

### Core Functionality
- **Event Discovery**: Browse curated music events with rich details
- **User Authentication**: Secure login/logout with Auth0 integration
- **RSVP System**: Reserve spots for events and track attendance
- **Comments**: Engage with other attendees through event comments
- **Responsive Design**: Optimized for desktop and mobile devices

### Technical Features
- **Automated Web Scraping**: Keeps event database current with Nashville Scene
- **Real-time Updates**: Dynamic content loading and state management
- **Robust API**: RESTful backend with comprehensive endpoints
- **Modern UI**: Clean, intuitive interface with Vanderbilt branding

## 🛠️ Technology Stack

### Frontend
- **React** - Modern component-based UI library
- **Auth0** - Secure authentication and user management
- **CSS3** - Custom styling with responsive design
- **React Router** - Client-side routing

### Backend  
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Puppeteer/Playwright** - Web scraping automation

### Deployment
- **Vercel** - Frontend hosting and deployment
- **Render** - Backend API hosting
- **MongoDB Atlas** - Cloud database hosting

## 📁 Project Structure

```
MyMusicCity/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/         # Main application pages
│   │   ├── AuthContext.jsx # Authentication context
│   │   └── styles.css     # Global styling
├── server/                # Node.js backend
│   ├── models/           # MongoDB data models
│   ├── routes/           # Express API routes
│   ├── middleware/       # Custom middleware
│   ├── scraping/         # Web scraping utilities
│   └── utils/            # Helper functions
├── docs/                 # Project documentation
└── README.md            # Project overview
```

## 🔧 Installation & Setup

For detailed installation instructions, see [INSTALLATION.md](INSTALLATION.md)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/MyMusicCity/MyMusicCity.git
   cd MyMusicCity
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` files and configure with your credentials
   - Set up MongoDB connection string
   - Configure Auth0 domain and client ID

4. **Start development servers**
   ```bash
   # Backend (from root directory)
   npm run dev
   
   # Frontend (in new terminal)
   cd client && npm start
   ```

## 🚀 Deployment

For production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Production URLs
- **Frontend**: https://my-music-city.vercel.app
- **Backend API**: https://mymusiccity.onrender.com

### Environment Variables
See `INSTALLATION.md` and `DEPLOYMENT.md` for complete environment configuration guides.

## 📖 API Documentation

### Main Endpoints
- `GET /api/events` - Retrieve all events
- `POST /api/rsvps` - Create new RSVP
- `GET /api/users/profile` - User profile data
- `POST /api/comments` - Add event comments

### Authentication
All user-specific endpoints require Auth0 JWT tokens in the Authorization header.

## 🧪 Testing

```bash
# Run all tests
npm test

# Frontend tests
cd client && npm test

# Backend tests  
cd server && npm test
```

## 👥 Team Members

- **Emma Chang** - emma.j.chang@vanderbilt.edu
- **Annette Ma** - annette.l.ma@vanderbilt.edu  
- **Jake Seals** - jake.d.seals@vanderbilt.edu

## 📅 Development Timeline

**Sprint 1** (September 25) - Tech stack setup and UX skeleton  
**Sprint 2** (October 21) - Web scraping implementation and core features  
**Sprint 3** (November 11) - UI design and optimization  
**Final Submission** (December 2) - Production deployment and presentation

## 📄 License

This project is created for educational purposes as part of Vanderbilt University coursework.