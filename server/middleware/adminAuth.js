// middleware/adminAuth.js
// Admin authentication and authorization middleware

/**
 * Middleware to check if user has admin role
 * Should be used after the regular auth middleware
 */
function requireAdmin(req, res, next) {
  try {
    // Check if user is authenticated first
    if (!req.user) {
      return res.status(401).json({ 
        error: "Authentication required" 
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: "Admin access required. Current role: " + (req.user.role || 'user')
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    res.status(500).json({ 
      error: "Internal server error during authorization" 
    });
  }
}

/**
 * Middleware to check if user is admin OR is accessing their own data
 * Useful for profile endpoints where users can access their own data or admins can access anyone's
 * @param {string} userIdParam - The parameter name that contains the user ID (default: 'userId')
 */
function requireAdminOrSelf(userIdParam = 'userId') {
  return (req, res, next) => {
    try {
      // Check if user is authenticated first
      if (!req.user) {
        return res.status(401).json({ 
          error: "Authentication required" 
        });
      }

      // Admin can access anything
      if (req.user.role === 'admin') {
        return next();
      }

      // Non-admin can only access their own data
      const requestedUserId = req.params[userIdParam];
      const currentUserId = req.user._id.toString();

      if (requestedUserId !== currentUserId) {
        return res.status(403).json({ 
          error: "Access denied. You can only access your own data." 
        });
      }

      next();
    } catch (error) {
      console.error("Admin or self auth middleware error:", error);
      res.status(500).json({ 
        error: "Internal server error during authorization" 
      });
    }
  };
}

/**
 * Middleware to check if user is admin OR is the creator of a resource
 * Useful for edit/delete endpoints where users can modify their own content or admins can modify anyone's
 * @param {Function} getResourceCreatorId - Function that returns the creator ID from the request
 */
function requireAdminOrCreator(getResourceCreatorId) {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated first
      if (!req.user) {
        return res.status(401).json({ 
          error: "Authentication required" 
        });
      }

      // Admin can access anything
      if (req.user.role === 'admin') {
        return next();
      }

      // Get the creator ID of the resource
      const creatorId = await getResourceCreatorId(req);
      const currentUserId = req.user._id.toString();

      if (!creatorId || creatorId.toString() !== currentUserId) {
        return res.status(403).json({ 
          error: "Access denied. You can only modify your own content." 
        });
      }

      next();
    } catch (error) {
      console.error("Admin or creator auth middleware error:", error);
      res.status(500).json({ 
        error: "Internal server error during authorization" 
      });
    }
  };
}

/**
 * Helper function to check if a user has admin role (for use in route handlers)
 * @param {Object} user - User object from req.user
 * @returns {boolean} - True if user is admin
 */
function isAdmin(user) {
  return user && user.role === 'admin';
}

/**
 * Helper function to promote a user to admin (for use in admin endpoints)
 * @param {Object} User - User model
 * @param {string} userId - ID of user to promote
 * @returns {Promise<Object>} - Updated user object
 */
async function promoteToAdmin(User, userId) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'admin' },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw new Error(`Failed to promote user to admin: ${error.message}`);
  }
}

/**
 * Helper function to demote an admin to regular user (for use in admin endpoints)
 * @param {Object} User - User model
 * @param {string} userId - ID of user to demote
 * @returns {Promise<Object>} - Updated user object
 */
async function demoteFromAdmin(User, userId) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'user' },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw new Error(`Failed to demote admin to user: ${error.message}`);
  }
}

module.exports = {
  requireAdmin,
  requireAdminOrSelf,
  requireAdminOrCreator,
  isAdmin,
  promoteToAdmin,
  demoteFromAdmin
};