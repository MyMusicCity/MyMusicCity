/**
 * Jest global teardown file for final cleanup
 * This runs after all test suites have completed
 */

const mongoose = require('mongoose');

module.exports = async () => {
  try {
    console.log('🏁 Running global test teardown...');
    
    // Force close any remaining database connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('✅ Global database disconnect completed');
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Global teardown completed');
    
    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
};