const express = require("express");
const { runManualCleanup } = require("../utils/cleanupJob");
const { ACCOUNT_STATES } = require("../utils/atomicUserCreation");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/admin/user-stats
 * Get user creation statistics and health metrics
 */
router.get("/user-stats", auth, async (req, res) => {
  try {
    // Only allow admin users to access these stats
    if (req.user?.mongoUser?.role !== "admin") {
      return res.status(403).json({ 
        error: "ADMIN_REQUIRED",
        message: "Admin privileges required" 
      });
    }

    const stats = {
      total: await User.countDocuments(),
      byState: {
        creating: await User.countDocuments({ accountState: ACCOUNT_STATES.CREATING }),
        pending: await User.countDocuments({ accountState: ACCOUNT_STATES.PENDING }),
        active: await User.countDocuments({ accountState: ACCOUNT_STATES.ACTIVE }),
        complete: await User.countDocuments({ accountState: ACCOUNT_STATES.COMPLETE }),
        error: await User.countDocuments({ accountState: ACCOUNT_STATES.ERROR }),
        legacy: await User.countDocuments({ accountState: { $exists: false } })
      },
      auth0Users: await User.countDocuments({ auth0Id: { $exists: true, $ne: null } }),
      incompleteProfiles: await User.countDocuments({ $or: [{ year: null }, { major: null }] }),
      recentCreations: {
        lastHour: await User.countDocuments({ 
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } 
        }),
        lastDay: await User.countDocuments({ 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
        })
      }
    };

    // Find potentially stuck users
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    const stuckUsers = await User.find({
      accountState: { $in: [ACCOUNT_STATES.CREATING, ACCOUNT_STATES.PENDING] },
      createdAt: { $lt: cutoffTime }
    }).select('username email accountState createdAt');

    res.json({
      stats,
      potentialIssues: {
        stuckUsersCount: stuckUsers.length,
        stuckUsers: stuckUsers.map(u => ({
          username: u.username,
          email: u.email,
          state: u.accountState,
          createdAt: u.createdAt,
          minutesStuck: Math.floor((Date.now() - u.createdAt) / (60 * 1000))
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ 
      error: "STATS_ERROR",
      message: "Failed to fetch user statistics" 
    });
  }
});

/**
 * POST /api/admin/cleanup-users
 * Manually trigger user cleanup job
 */
router.post("/cleanup-users", auth, async (req, res) => {
  try {
    // Only allow admin users to trigger cleanup
    if (req.user?.mongoUser?.role !== "admin") {
      return res.status(403).json({ 
        error: "ADMIN_REQUIRED",
        message: "Admin privileges required" 
      });
    }

    console.log(`Admin ${req.user.username} triggered manual user cleanup`);
    
    const result = await runManualCleanup();
    
    res.json({
      success: true,
      message: "User cleanup completed successfully",
      timestamp: new Date().toISOString(),
      triggeredBy: req.user.username
    });

  } catch (error) {
    console.error("Manual cleanup failed:", error);
    res.status(500).json({ 
      error: "CLEANUP_ERROR",
      message: "Failed to run user cleanup",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/user-creation-logs
 * Get recent user creation activity for monitoring
 */
router.get("/user-creation-logs", auth, async (req, res) => {
  try {
    if (req.user?.mongoUser?.role !== "admin") {
      return res.status(403).json({ 
        error: "ADMIN_REQUIRED",
        message: "Admin privileges required" 
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = parseInt(req.query.skip) || 0;

    const recentUsers = await User.find({
      auth0Id: { $exists: true, $ne: null }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('username email accountState createdAt auth0CreatedAt accountStateTransitions creationMetadata lastError');

    const logs = recentUsers.map(user => ({
      username: user.username,
      email: user.email,
      accountState: user.accountState,
      createdAt: user.createdAt,
      auth0CreatedAt: user.auth0CreatedAt,
      transitionsCount: user.accountStateTransitions?.length || 0,
      hasError: !!user.lastError,
      creationMethod: user.creationMetadata?.creationMethod,
      retryCount: user.creationMetadata?.retryCount || 0
    }));

    res.json({
      logs,
      pagination: {
        limit,
        skip,
        total: await User.countDocuments({ auth0Id: { $exists: true, $ne: null } })
      }
    });

  } catch (error) {
    console.error("Error fetching user creation logs:", error);
    res.status(500).json({ 
      error: "LOGS_ERROR",
      message: "Failed to fetch user creation logs" 
    });
  }
});

module.exports = router;