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
    // First try to find existing user by auth0Id
    let user = await User.findOne({ auth0Id });
    if (user) {
      return user;
    }

    // If not found, try to find by email (for migration of existing users)
    user = await User.findOne({ email });
    if (user) {
      // Update existing user with auth0Id
      user.auth0Id = auth0Id;
      await user.save();
      return user;
    }

    // Create new user for Auth0
    let username = email?.split('@')[0] || 'user';
    
    // Handle username conflicts with improved strategy
    const baseUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'; // Clean username
    let finalUsername = baseUsername;
    let counter = 1;
    const maxAttempts = 20; // Reasonable limit
    
    // Check for conflicts with bounded retry
    while (counter <= maxAttempts) {
      const existingUser = await User.findOne({ username: finalUsername });
      if (!existingUser) break;
      
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }
    
    // If still conflicts after maxAttempts, use timestamp
    if (counter > maxAttempts) {
      finalUsername = `${baseUsername}_${Date.now().toString().slice(-6)}`;
    }

    const newUser = new User({
      username: finalUsername,
      email: email,
      password: 'auth0-user', // Placeholder, not used for Auth0 users
      auth0Id: auth0Id,
      year: null,
      major: null
    });

    await newUser.save();
    return newUser;
  } catch (error) {
    console.error('Error finding/creating Auth0 user:', error);
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
