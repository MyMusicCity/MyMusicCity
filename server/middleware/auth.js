const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

// Find or create User record for Auth0 users with atomic operations
async function findOrCreateAuth0User(auth0Id, email) {
  const mongoose = require('mongoose');
  
  try {
    console.log(`Finding/creating user for auth0Id: ${auth0Id}, email: ${email}`);
    
    // Validate required parameters
    if (!auth0Id) {
      throw new Error('Auth0 ID is required for user creation');
    }
    if (!email) {
      throw new Error('Email is required for user creation');
    }
    
    // First try to find existing user by auth0Id (most reliable)
    let user = await User.findOne({ auth0Id });
    if (user) {
      console.log('Found existing user by auth0Id:', user.username);
      return user;
    }

    // Start a transaction for atomic user creation
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        // Check again within transaction to prevent race conditions
        let existingUser = await User.findOne({ auth0Id }).session(session);
        if (existingUser) {
          console.log('User created by another process, returning existing user');
          return existingUser;
        }

        // Check for existing user by email (for migration)
        existingUser = await User.findOne({ email: email.toLowerCase().trim() }).session(session);
        if (existingUser) {
          if (!existingUser.auth0Id) {
            console.log('Found existing user by email, adding auth0Id:', existingUser.username);
            // Update existing user with auth0Id atomically
            existingUser.auth0Id = auth0Id;
            await existingUser.save({ session });
            console.log('Successfully linked existing account with Auth0');
            return existingUser;
          } else if (existingUser.auth0Id !== auth0Id) {
            // Account conflict: same email but different auth0Id
            console.log('⚠️ Account conflict detected - email exists with different auth0Id');
            throw new Error('ACCOUNT_CONFLICT: This email is already associated with a different Auth0 account. Please use account cleanup or contact support.');
          }
        }

        // Generate unique username
        const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
        let finalUsername = baseUsername;
        let counter = 1;
        const maxAttempts = 10; // Reduced for transaction efficiency
        
        while (counter <= maxAttempts) {
          const conflictUser = await User.findOne({ username: finalUsername }).session(session);
          if (!conflictUser) {
            break;
          }
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }
        
        // Fallback to timestamp if still conflicts
        if (counter > maxAttempts) {
          finalUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
        }

        console.log(`Creating new user with username: ${finalUsername}`);
        
        // Create new user atomically
        const newUserData = {
          username: finalUsername,
          email: email.toLowerCase().trim(),
          password: 'auth0-user', // Placeholder for Auth0 users
          auth0Id: auth0Id,
          year: null,
          major: null,
          createdAt: new Date(),
          isProfileComplete: false
        };

        const newUser = new User(newUserData);
        await newUser.save({ session });
        console.log('Successfully created new Auth0 user:', finalUsername);
        return newUser;
      });
      
      return result;
      
    } finally {
      await session.endSession();
    }
    
  } catch (error) {
    console.error('Error in findOrCreateAuth0User:', error);
    
    // Handle specific error types
    if (error.message.includes('ACCOUNT_CONFLICT')) {
      throw error; // Re-throw account conflict errors with original message
    }
    
    if (error.code === 11000) {
      if (error.message.includes('username')) {
        throw new Error('USERNAME_CONFLICT: Username generation failed due to conflicts. Please try again.');
      } else if (error.message.includes('email')) {
        throw new Error('EMAIL_CONFLICT: Email already exists with different Auth0 ID. Please use account cleanup.');
      }
      throw new Error('DUPLICATE_DATA: Data conflict during user creation. Please try again.');
    }
    
    // Generic fallback error
    throw new Error(`USER_CREATION_FAILED: ${error.message}`);
  }
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
          // Validate token claims
          if (!decoded.sub || !decoded.email) {
            return res.status(401).json({ 
              error: "INVALID_TOKEN_CLAIMS",
              message: "Token missing required user information"
            });
          }
          
          // Find or create MongoDB User record for Auth0 user
          const mongoUser = await findOrCreateAuth0User(decoded.sub, decoded.email);
          
          // Check if profile is complete
          const isProfileComplete = mongoUser.year && mongoUser.major;
          
          req.user = { 
            id: decoded.sub,
            email: decoded.email,
            username: mongoUser.username,
            auth0Id: decoded.sub,
            mongoUser: mongoUser,
            isProfileComplete: isProfileComplete
          };
          
          console.log(`Auth0 user authenticated: ${mongoUser.username} (Profile complete: ${isProfileComplete})`);
          return next();
        } catch (userError) {
          console.error('Failed to find/create Auth0 user:', userError);
          
          // Handle specific user creation errors
          if (userError.message.includes('ACCOUNT_CONFLICT')) {
            return res.status(409).json({ 
              error: "ACCOUNT_CONFLICT",
              message: "Email conflict with existing account",
              action: "cleanup",
              details: userError.message
            });
          }
          
          if (userError.message.includes('USERNAME_CONFLICT') || userError.message.includes('EMAIL_CONFLICT')) {
            return res.status(409).json({ 
              error: "DATA_CONFLICT",
              message: "User data conflict during account creation",
              action: "retry",
              details: process.env.NODE_ENV === 'development' ? userError.message : undefined
            });
          }
          
          return res.status(500).json({ 
            error: "USER_CREATION_FAILED",
            message: "Failed to create or retrieve user account",
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
