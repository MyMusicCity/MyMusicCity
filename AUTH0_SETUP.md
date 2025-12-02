# Auth0 Setup Instructions for MyMusicCity

## 1. Create Auth0 Account and Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/dashboard/)
2. Create a new account or sign in
3. Click "Create Application"
4. Choose "Single Page Application" 
5. Name it "MyMusicCity"

## 2. Configure Application Settings

In your Auth0 application settings, set these values:

**Allowed Callback URLs:**
```
http://localhost:3000, https://your-production-domain.com
```

**Allowed Logout URLs:**
```
http://localhost:3000, https://your-production-domain.com
```

**Allowed Web Origins:**
```
http://localhost:3000, https://your-production-domain.com
```

**Allowed Origins (CORS):**
```
http://localhost:3000, https://your-production-domain.com
```

## 3. Update Environment Variables

In your `client/.env` file, update these values from your Auth0 application:

```bash
REACT_APP_AUTH0_DOMAIN=your-auth0-domain.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your-client-id-from-auth0
```

You can find these values in your Auth0 application's "Settings" tab.

## 4. Restrict to Vanderbilt Users (Optional)

To restrict access to only Vanderbilt students, you can:

### Option A: Auth0 Rules (Recommended)
1. Go to Auth Pipeline > Rules in your Auth0 dashboard
2. Create a new rule with this code:

```javascript
function restrictToVanderbilt(user, context, callback) {
  const allowedDomain = 'vanderbilt.edu';
  
  if (!user.email.endsWith(`@${allowedDomain}`)) {
    return callback(new UnauthorizedError('Access denied. Only Vanderbilt email addresses are allowed.'));
  }
  
  callback(null, user, context);
}
```

### Option B: Auth0 Actions (New way)
1. Go to Actions > Flows > Login
2. Create a new action with this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const allowedDomain = 'vanderbilt.edu';
  
  if (!event.user.email.endsWith(`@${allowedDomain}`)) {
    api.access.deny('Access denied. Only Vanderbilt email addresses are allowed.');
  }
};
```

## 5. Configure Social Connections (Optional)

To allow students to sign in with their Google accounts:

1. Go to Authentication > Social
2. Enable Google OAuth2
3. Configure with your Google OAuth credentials
4. Make sure to set the allowed domains to vanderbilt.edu

## 6. Test the Integration

1. Start your development server:
```bash
cd client
npm start
```

2. Navigate to `http://localhost:3000`
3. Click "Sign In with Vanderbilt Account"
4. You should be redirected to Auth0's login page
5. After successful authentication, you'll be redirected back to your app

## 7. Production Deployment

When deploying to production:

1. Update the URLs in your Auth0 application settings to include your production domain
2. Update your `.env` file with production environment variables
3. Ensure your Auth0 domain restrictions are properly configured

## Troubleshooting

**Common Issues:**

1. **"Auth0 configuration missing" error**
   - Make sure your `.env` file has the correct environment variable names
   - Restart your development server after updating `.env`

2. **Redirect URI mismatch**
   - Ensure your Auth0 application's Allowed Callback URLs include your current domain
   - Check that the URLs don't have trailing slashes

3. **CORS errors**
   - Add your domain to Allowed Web Origins in Auth0 settings
   - Make sure Allowed Origins (CORS) includes your domain

4. **User not redirected after login**
   - Check browser console for errors
   - Verify your redirect_uri is correctly set in the Auth0Provider

## Features Implemented

✅ Secure authentication with Auth0  
✅ Vanderbilt email restriction  
✅ User profile integration  
✅ Automatic token management  
✅ Logout functionality  
✅ Loading states  
✅ Error handling  
✅ MyMusicCity design system integration  

The Auth0 integration preserves your existing UI design while providing enterprise-grade security and user management.