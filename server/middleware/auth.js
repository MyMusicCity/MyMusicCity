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

// Find or create User record for Auth0 users
async function findOrCreateAuth0User(auth0Id, email) {
  try {
    console.log(`Finding/creating user for auth0Id: ${auth0Id}, email: ${email}`);
    
    // First try to find existing user by auth0Id
    let user = await User.findOne({ auth0Id });
    if (user) {
      console.log('Found existing user by auth0Id:', user.username);
      return user;
    }

    // If not found, try to find by email (for migration of existing users)
    user = await User.findOne({ email });
    if (user) {
      if (!user.auth0Id) {
        console.log('Found existing user by email, adding auth0Id:', user.username);
        // Update existing user with auth0Id
        user.auth0Id = auth0Id;
        try {
          await user.save();
          console.log('Successfully updated user with auth0Id');
          return user;
        } catch (saveError) {
          console.error('Failed to save auth0Id to existing user:', saveError);
          throw new Error(`Failed to link existing account: ${saveError.message}`);
        }
      } else if (user.auth0Id !== auth0Id) {
        // Account conflict: same email but different auth0Id
        console.log('⚠️ Account conflict detected - email exists with different auth0Id');
        console.log(`Existing auth0Id: ${user.auth0Id}, New auth0Id: ${auth0Id}`);
        throw new Error('Account conflict: This email is already associated with a different account. Please contact support or delete the existing account.');
      }
    }

    // Create new user for Auth0
    if (!email) {
      throw new Error('Email is required for user creation');
    }
    
    let username = email.split('@')[0] || 'user';
    
    // Handle username conflicts with improved strategy
    const baseUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    let finalUsername = baseUsername;
    let counter = 1;
    const maxAttempts = 50; // Increased attempts
    
    console.log(`Generating username starting with: ${baseUsername}`);
    
    // Check for conflicts with bounded retry
    while (counter <= maxAttempts) {
      const existingUser = await User.findOne({ username: finalUsername });
      if (!existingUser) {
        console.log(`Username available: ${finalUsername}`);
        break;
      }
      
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }
    
    // If still conflicts after maxAttempts, use timestamp
    if (counter > maxAttempts) {
      finalUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
      console.log(`Using timestamp fallback username: ${finalUsername}`);
    }

    console.log(`Creating new user with username: ${finalUsername}, email: ${email}`);
    
    const newUser = new User({
      username: finalUsername,
      email: email.toLowerCase().trim(),
      password: 'auth0-user', // Placeholder, not used for Auth0 users
      auth0Id: auth0Id,
      year: null,
      major: null
    });

    try {
      await newUser.save();
      console.log('Successfully created new user:', finalUsername);
      return newUser;
    } catch (saveError) {
      console.error('Failed to save new user:', saveError);
      // Check for specific error types
      if (saveError.code === 11000) {
        if (saveError.message.includes('username')) {
          throw new Error('Username conflict detected. Please try again.');
        } else if (saveError.message.includes('email')) {
          throw new Error('Email already exists. Please contact support.');
        } else {
          throw new Error('Duplicate data conflict. Please try again.');
        }
      }
      throw new Error(`User creation failed: ${saveError.message}`);
    }
  } catch (error) {
    console.error('Error in findOrCreateAuth0User:', error);
    throw error;
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
    jwt.verify(token, getKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, async (err, decoded) => {
      if (!err && decoded) {
        // Successfully verified Auth0 token
        try {
          // Find or create MongoDB User record for Auth0 user
          const mongoUser = await findOrCreateAuth0User(decoded.sub, decoded.email);
          
          req.user = { 
            id: mongoUser._id.toString(), // Use MongoDB ObjectId for consistency
            email: decoded.email,
            auth0Id: decoded.sub,
            username: mongoUser.username,
            mongoUser: mongoUser // Include the full MongoDB user record
          };
          return next();
        } catch (dbError) {
          console.error('Critical: Failed to create/find MongoDB user for Auth0 user:', dbError);
          // Don't continue without MongoDB user - this breaks functionality
          return res.status(500).json({ 
            error: "Unable to create user profile. Please try signing out and back in, or contact support if this continues.",
            details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
          });
        }
      }
      
      // Auth0 verification failed, try local JWT as fallback
      tryLocalJWT(token, req, res, next);
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
