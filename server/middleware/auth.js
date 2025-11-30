const jwt = require("jsonwebtoken");

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
    jwt.verify(token, getKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (!err && decoded) {
        // Successfully verified Auth0 token
        req.user = { 
          id: decoded.sub, // Auth0 user ID (e.g., "auth0|123456")
          email: decoded.email,
          auth0Id: decoded.sub,
          username: decoded.email?.split('@')[0] || 'user'
        };
        return next();
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
