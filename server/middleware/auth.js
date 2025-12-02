const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { findOrCreateAuth0UserAtomic } = require("../utils/atomicUserCreation");

// Try to load jwks-rsa for Auth0 support
let jwksClient = null;
try {
  jwksClient = require('jwks-rsa');
} catch (e) {
  console.warn('jwks-rsa not available, Auth0 token verification disabled');
}

// Auth0 JWKS client for token verification
let client = null;
if (process.env.AUTH0_DOMAIN && jwksClient) {
  client = jwksClient({
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000 // 10 minutes
  });
}

// Get signing key for Auth0 token verification
function getKey(header, callback) {
  if (!client) {
    return callback(new Error('Auth0 not configured'));
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

module.exports = function auth(req, res, next) {
  const header = req.headers && req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Invalid Authorization format" });

  const token = parts[1];
  
  // Try Auth0 token verification first
  if (process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE && client) {
    console.log(`🔐 Auth0 verification attempt:`);
    console.log(`- Domain: ${process.env.AUTH0_DOMAIN}`);
    console.log(`- Audience: ${process.env.AUTH0_AUDIENCE}`);
    console.log(`- Token preview: ${token.substring(0, 20)}...`);
    
    jwt.verify(token, getKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, async (err, decoded) => {
      if (!err && decoded) {
        // Successfully verified Auth0 token
        console.log(`Auth0 token verified for user: ${decoded.email}`);
        
        try {
          // Validate token claims - be more permissive
          if (!decoded.sub) {
            console.log('❌ Missing subject (sub) in token claims');
            return res.status(401).json({ 
              error: "INVALID_TOKEN_CLAIMS",
              message: "Token missing user identifier"
            });
          }
          
          // Email validation with better fallback handling
          let userEmail = decoded.email || decoded['https://myapp/email'];
          
          // Validate email format if present
          if (userEmail && (!userEmail.includes('@') || userEmail.length < 5)) {
            console.warn('⚠️ Invalid email format in token, using Auth0 ID fallback');
            userEmail = `${decoded.sub.replace(/[^a-zA-Z0-9]/g, '_')}@auth0.temp`;
          }
          
          // Final fallback if no valid email
          if (!userEmail) {
            userEmail = `${decoded.sub.replace(/[^a-zA-Z0-9]/g, '_')}@auth0.temp`;
          }
          
          console.log('✅ Token claims validated:', {
            sub: decoded.sub,
            email: userEmail,
            hasEmail: !!decoded.email
          });
          
          // Use new atomic user creation system
          const mongoUser = await findOrCreateAuth0UserAtomic(decoded.sub, userEmail);
          
          // Check if profile is complete
          const isProfileComplete = mongoUser.year && mongoUser.major && mongoUser.accountState === 'complete';
          
          req.user = { 
            id: mongoUser._id,
            email: userEmail,
            username: mongoUser.username,
            auth0Id: decoded.sub,
            mongoUser: mongoUser,
            isProfileComplete: isProfileComplete
          };
          
          console.log(`✅ Auth0 user authenticated successfully:`, {
            username: mongoUser.username,
            email: userEmail,
            mongoId: mongoUser._id,
            auth0Id: decoded.sub,
            profileComplete: isProfileComplete,
            accountState: mongoUser.accountState,
            reqUserId: req.user.id
          });
          return next();
        } catch (userError) {
          console.error('❌ Failed to find/create Auth0 user:', {
            error: userError.message,
            auth0Sub: decoded.sub,
            email: userEmail,
            stack: userError.stack?.substring(0, 200)
          });
          
          // Enhanced error handling for atomic user creation
          if (userError.message.includes('ACCOUNT_CONFLICT')) {
            return res.status(409).json({ 
              error: "ACCOUNT_CONFLICT",
              message: "Email conflict with existing account. Please use account cleanup or contact support.",
              action: "cleanup",
              details: userError.message.includes('development') ? userError.message : undefined
            });
          }
          
          if (userError.message.includes('INVALID_')) {
            return res.status(400).json({
              error: "INVALID_USER_DATA", 
              message: "Invalid user information provided",
              action: "retry",
              details: process.env.NODE_ENV === 'development' ? userError.message : undefined
            });
          }
          
          if (userError.message.includes('USER_CREATION_FAILED')) {
            return res.status(503).json({ 
              error: "USER_CREATION_FAILED",
              message: "Temporary issue creating user account. Please try again.",
              action: "retry",
              details: process.env.NODE_ENV === 'development' ? userError.message : 'Please contact support if this persists'
            });
          }
          
          return res.status(500).json({ 
            error: "AUTHENTICATION_ERROR",
            message: "Failed to authenticate user",
            details: process.env.NODE_ENV === 'development' ? userError.message : 'Please contact support if this persists'
          });
        }
      } else {
        console.error('❌ Auth0 token verification failed:', err?.message || err);
        console.error('Error details:', {
          name: err?.name,
          message: err?.message,
          code: err?.code
        });
        console.log('🔄 Falling back to local JWT verification');
        // Fall back to local JWT verification
        return tryLocalJWT(token, req, res, next);
      }
    });
  } else {
    // No Auth0 configured, use local JWT only
    tryLocalJWT(token, req, res, next);
  }
};

// Fallback to local JWT verification
function tryLocalJWT(token, req, res, next) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "supersecretjwtkey");
    // Attach a minimal user object to the request
    req.user = { 
      id: payload.id, 
      email: payload.email,
      username: payload.username
    };
    return next();
  } catch (err) {
    return res.status(401).json({ 
      error: "Invalid or expired token",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
