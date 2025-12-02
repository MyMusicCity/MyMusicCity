# MyMusicCity - Deployment Instructions

## Production Deployment Guide

This document provides step-by-step instructions for deploying MyMusicCity to production environments.

## Deployment Architecture

- **Frontend**: Vercel (Static hosting for React app)
- **Backend**: Render (Node.js hosting)
- **Database**: MongoDB Atlas (Cloud database)
- **Authentication**: Auth0 (Identity provider)
- **Domain**: Custom domain (optional)

## Pre-Deployment Checklist

- [ ] All features tested locally
- [ ] Unit tests passing
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Auth0 production settings configured
- [ ] Code committed to main branch

## Backend Deployment (Render)

### 1. Prepare Repository

Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Create Render Account

1. Visit [Render](https://render.com/)
2. Sign up with GitHub account
3. Authorize Render to access your repositories

### 3. Deploy Backend Service

1. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `MyMusicCity`
   - Select branch: `main`

2. **Configure Service**:
   - **Name**: `mymusiccity-backend`
   - **Root Directory**: Leave empty (uses root)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Set Environment Variables**:
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mymusiccity
   AUTH0_DOMAIN=your-domain.auth0.com
   AUTH0_AUDIENCE=https://your-api-identifier
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   JWT_SECRET=your-production-jwt-secret
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ```

4. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete (5-10 minutes)
   - Note the service URL: `https://mymusiccity.onrender.com`

### 4. Verify Backend Deployment

Test endpoints:
- `https://mymusiccity.onrender.com/` - Should show welcome message
- `https://mymusiccity.onrender.com/healthz` - Should return `{"ok": true}`
- `https://mymusiccity.onrender.com/api/events` - Should return events data

## Frontend Deployment (Vercel)

### 1. Create Vercel Account

1. Visit [Vercel](https://vercel.com/)
2. Sign up with GitHub account
3. Import your repository

### 2. Configure Project

1. **Import Project**:
   - Click "New Project"
   - Import `MyMusicCity` repository
   - Select `client` folder as root directory

2. **Build Settings**:
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `build` (auto-detected)

3. **Environment Variables**:
   ```
   REACT_APP_AUTH0_DOMAIN=your-domain.auth0.com
   REACT_APP_AUTH0_CLIENT_ID=your-client-id
   REACT_APP_AUTH0_AUDIENCE=https://your-api-identifier
   REACT_APP_API_URL=https://mymusiccity.onrender.com
   REACT_APP_ENFORCE_VANDERBILT_EMAIL=false
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (3-5 minutes)
   - Note the domain: `https://your-project.vercel.app`

### 3. Configure Custom Domain (Optional)

1. **Add Domain**:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **SSL Certificate**:
   - Vercel automatically provides SSL certificates
   - Verify HTTPS is working

## Database Setup (MongoDB Atlas)

### 1. Production Database

1. **Create Production Cluster**:
   - Login to MongoDB Atlas
   - Create a new cluster or use existing
   - Name: `MyMusicCity-Production`

2. **Configure Security**:
   - Create database user for production
   - Add IP addresses: `0.0.0.0/0` (or specific Render IPs)
   - Enable network security

3. **Get Connection String**:
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Update `MONGO_URI` in Render environment variables

### 2. Seed Production Database (Optional)

```bash
# Run seeding script with production database
MONGO_URI="your-production-connection-string" node seed.js
```

## Auth0 Production Configuration

### 1. Update Application Settings

1. **Allowed Callback URLs**:
   ```
   https://your-project.vercel.app,
   https://mymusiccity.onrender.com,
   http://localhost:3000
   ```

2. **Allowed Logout URLs**:
   ```
   https://your-project.vercel.app,
   http://localhost:3000
   ```

3. **Allowed Web Origins**:
   ```
   https://your-project.vercel.app,
   http://localhost:3000
   ```

4. **CORS Origins**:
   ```
   https://your-project.vercel.app,
   https://mymusiccity.onrender.com
   ```

### 2. API Configuration

1. **Update API Settings**:
   - Go to APIs → Your API
   - Add allowed origins in CORS settings

2. **Test Authentication**:
   - Visit production site
   - Test login/logout functionality

## Environment Variables Summary

### Render (Backend)
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
AUTH0_DOMAIN=domain.auth0.com
AUTH0_AUDIENCE=https://api-identifier
CORS_ORIGIN=https://frontend-domain.vercel.app
JWT_SECRET=production-secret
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### Vercel (Frontend)
```env
REACT_APP_AUTH0_DOMAIN=domain.auth0.com
REACT_APP_AUTH0_CLIENT_ID=client-id
REACT_APP_AUTH0_AUDIENCE=https://api-identifier
REACT_APP_API_URL=https://backend-domain.onrender.com
REACT_APP_ENFORCE_VANDERBILT_EMAIL=false
```

## Post-Deployment Verification

### 1. Functional Testing

Test all major features:
- [ ] Homepage loads correctly
- [ ] User authentication (login/logout)
- [ ] Event listing displays
- [ ] RSVP functionality works
- [ ] Comments can be added
- [ ] Profile management
- [ ] Responsive design on mobile

### 2. Performance Testing

- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] Mobile performance acceptable

### 3. Security Testing

- [ ] HTTPS enforced on all pages
- [ ] Authentication required for protected routes
- [ ] CORS properly configured
- [ ] No sensitive data exposed in client

## Monitoring and Maintenance

### 1. Set Up Monitoring

1. **Render Monitoring**:
   - Enable health checks
   - Set up alerts for downtime
   - Monitor resource usage

2. **MongoDB Monitoring**:
   - Enable Atlas monitoring
   - Set up alerts for high usage
   - Monitor connection count

### 2. Regular Maintenance

- Update dependencies monthly
- Monitor error logs weekly
- Backup database regularly
- Test deployment pipeline quarterly

## Rollback Procedures

### 1. Frontend Rollback (Vercel)

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

### 2. Backend Rollback (Render)

1. Go to Render Dashboard → Service
2. Find previous deployment in history
3. Redeploy previous commit hash

### 3. Database Rollback

1. Restore from MongoDB Atlas backup
2. Update connection strings if needed

## Troubleshooting Common Deployment Issues

### Build Failures

```bash
# Check build logs in Vercel/Render dashboard
# Common issues:
- Missing environment variables
- Dependency version conflicts
- Build timeout (increase timeout in settings)
```

### Runtime Errors

```bash
# Check application logs
# Common issues:
- Database connection failures
- Auth0 configuration errors
- CORS policy violations
```

### Performance Issues

- Check bundle size in Vercel analytics
- Monitor API response times in Render
- Optimize database queries
- Enable gzip compression

## Scaling Considerations

### 1. Horizontal Scaling

- Render: Upgrade to paid plan for auto-scaling
- MongoDB: Consider sharding for large datasets
- CDN: Add CloudFront or similar for global distribution

### 2. Vertical Scaling

- Increase Render service resources
- Upgrade MongoDB cluster tier
- Optimize application code and queries

## Backup and Recovery

### 1. Database Backups

- MongoDB Atlas provides automatic backups
- Configure backup retention policy
- Test restore procedures regularly

### 2. Code Backups

- GitHub serves as primary code backup
- Tag releases for easy rollback
- Maintain deployment documentation

## Support and Documentation

For deployment issues:
1. Check service dashboards (Render, Vercel, MongoDB Atlas)
2. Review application logs
3. Verify environment variables
4. Test locally with production config
5. Contact support if needed

## Production URLs

After successful deployment:
- **Frontend**: https://my-music-city.vercel.app
- **Backend**: https://mymusiccity.onrender.com
- **API Documentation**: Available in main README.md

## Security Best Practices

- [ ] Environment variables secured
- [ ] API rate limiting enabled
- [ ] Database access restricted
- [ ] HTTPS enforced
- [ ] Auth0 security settings configured
- [ ] Regular security updates applied