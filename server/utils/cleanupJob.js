const { cleanupOrphanedUsers } = require('../utils/atomicUserCreation');
const cron = require('node-cron');

/**
 * Background job to cleanup orphaned users and maintain database health
 * Runs every 15 minutes to cleanup failed user creation attempts
 */
function startCleanupJob() {
  // Only run cleanup jobs in production or when explicitly enabled
  const enableCleanup = process.env.ENABLE_CLEANUP_JOBS === 'true' || process.env.NODE_ENV === 'production';
  
  if (!enableCleanup) {
    console.log('🧹 User cleanup jobs disabled (set ENABLE_CLEANUP_JOBS=true to enable)');
    return;
  }

  console.log('🧹 Starting user cleanup background job...');
  
  // Run cleanup every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('🧹 Running scheduled user cleanup...');
      await cleanupOrphanedUsers();
      console.log('✅ Scheduled user cleanup completed');
    } catch (error) {
      console.error('❌ Scheduled user cleanup failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: "America/Chicago" // Nashville timezone
  });

  // Also run cleanup once at startup with a delay
  setTimeout(async () => {
    try {
      console.log('🧹 Running startup user cleanup...');
      await cleanupOrphanedUsers();
      console.log('✅ Startup user cleanup completed');
    } catch (error) {
      console.error('❌ Startup user cleanup failed:', error.message);
    }
  }, 30000); // Wait 30 seconds after startup
}

/**
 * Manual cleanup function that can be called via API endpoint
 */
async function runManualCleanup() {
  try {
    console.log('🧹 Running manual user cleanup...');
    const result = await cleanupOrphanedUsers();
    console.log('✅ Manual user cleanup completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Manual user cleanup failed:', error.message);
    // Don't re-throw in production to avoid API errors
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }
    return { error: error.message, success: false };
  }
}

/**
 * Graceful cleanup for test environments
 */
async function stopCleanupJob() {
  try {
    console.log('🛑 Stopping cleanup job gracefully...');
    // Clear any running intervals/timeouts
    if (global.cleanupInterval) {
      clearInterval(global.cleanupInterval);
      global.cleanupInterval = null;
    }
    console.log('✅ Cleanup job stopped');
  } catch (error) {
    console.error('❌ Failed to stop cleanup job:', error.message);
  }
}

module.exports = {
  startCleanupJob,
  runManualCleanup,
  stopCleanupJob
};