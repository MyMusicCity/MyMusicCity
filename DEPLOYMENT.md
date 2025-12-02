# MyMusicCity - Deployment Instructions

## Production Deployment Guide

This document provides step-by-step instructions for deploying MyMusicCity to production environments using Render (backend) and Vercel (frontend).

## Deployment Architecture

- **Frontend**: Vercel - https://my-music-city.vercel.app
- **Backend**: Render - https://mymusiccity.onrender.com  
- **Database**: MongoDB Atlas
- **Authentication**: Auth0 (dev-marf1ou3h5lcf4a7.us.auth0.com)

## Backend Deployment (Render)

### 1. Prepare Repository

Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Create Render Service

1. **Visit Render**: https://render.com/
2. **Create Account**: Sign up with GitHub account
3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect GitHub repository: `MyMusicCity`
   - Select branch: `main`

### 3. Configure Render Service

**Service Configuration:**
- **Name**: `mymusiccity`
- **Root Directory**: Leave empty
- **Environment**: `Node`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. Set Render Environment Variables

Copy these exact values into Render Dashboard → Environment Variables:

```bash
AUTH0_AUDIENCE=https://dev-marf1ou3h5lcf4a7.us.auth0.com/api/v2/
AUTH0_DOMAIN=dev-marf1ou3h5lcf4a7.us.auth0.com
CLIENT_URL=https://my-music-city.vercel.app
CORS_ORIGIN=https://my-music-city.vercel.app
JWT_SECRET=someRandomSecretKey
LOG_LEVEL=info
MONGO_URI=mongodb+srv://jakedseals_db_user:zGsll0PkzRDsDZzd@mymusiccity.nlcnv6s.mongodb.net/mymusiccity?retryWrites=true&w=majority
NODE_ENV=production
NODE_VERSION=20
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

### 5. Deploy Backend

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Service will be available at: `https://mymusiccity.onrender.com`

### 6. Verify Backend Deployment

Test these endpoints:
- `https://mymusiccity.onrender.com/` - Should show "Hello from MyMusicCity backend!"
- `https://mymusiccity.onrender.com/healthz` - Should return `{"ok": true}`
- `https://mymusiccity.onrender.com/api/events` - Should return events data

## Frontend Deployment (Vercel)

### 1. Create Vercel Account

1. **Visit Vercel**: https://vercel.com/
2. **Sign Up**: Use GitHub account
3. **Import Project**: Import `MyMusicCity` repository

### 2. Configure Vercel Project

**Project Settings:**
- **Framework Preset**: Create React App
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### 3. Set Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```bash
MONGO_URI=mongodb+srv://jakedseals_db_user:zGsll0PkzRDsDZzd@mymusiccity.nlcnv6s.mongodb.net/mymusiccity
AUTH0_AUDIENCE=https://dev-marf1ou3h5lcf4a7.us.auth0.com/api/v2/
REACT_APP_AUTH0_AUDIENCE=https://dev-marf1ou3h5lcf4a7.us.auth0.com/api/v2/
REACT_APP_AUTH0_DOMAIN=dev-marf1ou3h5lcf4a7.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=3EEDIjpgitrhaRwhBURrOE542m5OiNVJ
REACT_APP_API_URL=https://mymusiccity.onrender.com
REACT_APP_ENFORCE_VANDERBILT_EMAIL=false
```

**Important**: Set environment for ALL environments (Production, Preview, Development)

### 4. Deploy Frontend

1. Click "Deploy"
2. Wait for build completion (3-5 minutes)
3. Site will be available at: `https://my-music-city.vercel.app`

### 5. Verify Frontend Deployment

- Visit `https://my-music-city.vercel.app`
- Test user authentication (login/logout)
- Verify events are loading from backend
- Test RSVP functionality

## Database Configuration (MongoDB Atlas)

### Current Database Setup

The application uses an existing MongoDB Atlas cluster:
- **Connection String**: `mongodb+srv://jakedseals_db_user:zGsll0PkzRDsDZzd@mymusiccity.nlcnv6s.mongodb.net/mymusiccity`
- **Database Name**: `mymusiccity`
- **User**: `jakedseals_db_user`

### Database Access

1. **IP Whitelist**: Ensure `0.0.0.0/0` is whitelisted for Render access
2. **User Permissions**: Database user has read/write access to `mymusiccity` database
3. **Connection**: Both Render and Vercel use the same connection string

## Auth0 Configuration

### Current Auth0 Setup

- **Domain**: `dev-marf1ou3h5lcf4a7.us.auth0.com`
- **Client ID**: `3EEDIjpgitrhaRwhBURrOE542m5OiNVJ`
- **API Audience**: `https://dev-marf1ou3h5lcf4a7.us.auth0.com/api/v2/`

### Required Auth0 Settings

In Auth0 Dashboard → Applications → MyMusicCity:

**Allowed Callback URLs:**
```
https://my-music-city.vercel.app,
http://localhost:3000
```

**Allowed Logout URLs:**
```
https://my-music-city.vercel.app,
http://localhost:3000
```

**Allowed Web Origins:**
```
https://my-music-city.vercel.app,
http://localhost:3000
```

**Allowed Origins (CORS):**
```
https://my-music-city.vercel.app,
https://mymusiccity.onrender.com,
http://localhost:3000
```

## Deployment Verification Checklist

### Backend (Render) Verification
- [ ] Service starts without errors
- [ ] Health check endpoint responds: `/healthz`
- [ ] API endpoints work: `/api/events`
- [ ] Database connection established
- [ ] Auth0 integration functional
- [ ] Web scraping components installed

### Frontend (Vercel) Verification  
- [ ] Build completes successfully
- [ ] Site loads at production URL
- [ ] Auth0 login/logout works
- [ ] Events display correctly
- [ ] RSVP functionality works
- [ ] Comments system operational
- [ ] Mobile responsive design

### Integration Testing
- [ ] Frontend can communicate with backend API
- [ ] Authentication flows end-to-end
- [ ] Data persists correctly in MongoDB
- [ ] Real-time updates function properly

## Production URLs

- **Live Application**: https://my-music-city.vercel.app
- **Backend API**: https://mymusiccity.onrender.com
- **GitHub Repository**: https://github.com/MyMusicCity/MyMusicCity

## Troubleshooting

### Common Render Issues

**Build Failures:**
- Check environment variables are set correctly
- Verify Node.js version compatibility
- Review build logs in Render dashboard

**Runtime Errors:**
- Check application logs in Render dashboard
- Verify MongoDB connection string
- Ensure Auth0 configuration is correct

### Common Vercel Issues

**Build Failures:**
- Verify `client` directory is set as root
- Check all `REACT_APP_` environment variables
- Review build logs for dependency issues

**Runtime Errors:**
- Verify API URL points to correct Render service
- Check Auth0 client ID and domain
- Test API connectivity in browser dev tools

### Database Issues

**Connection Failures:**
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check username/password in connection string
- Ensure database user has proper permissions

## Maintenance

### Regular Updates
- Monitor Render and Vercel dashboards for issues
- Update dependencies monthly
- Monitor MongoDB Atlas usage and costs
- Review Auth0 usage and logs

### Performance Monitoring
- Render provides automatic health checks
- Vercel provides analytics and performance metrics
- MongoDB Atlas provides database monitoring

### Scaling
- Render: Upgrade to paid plans for better performance
- Vercel: Automatically scales with usage
- MongoDB: Monitor and upgrade cluster size as needed