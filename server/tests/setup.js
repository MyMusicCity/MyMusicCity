/**
 * Jest setup file for proper test environment initialization
 * This runs after the test environment is set up but before tests run
 */

const { stopCleanupJob } = require('../utils/cleanupJob');

// Set test timeout
jest.setTimeout(10000);

// Setup test environment
beforeAll(async () => {
  try {
    // Ensure we're in test environment
    if (process.env.NODE_ENV !== 'test') {
      process.env.NODE_ENV = 'test';
    }
    
    console.log('📦 Test environment initialized');
    
    // Don't try to connect to database here - let individual tests handle it
    // This prevents conflicts with existing test database connections
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear any test timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Proper cleanup after all tests
afterAll(async () => {
  try {
    console.log('🧹 Cleaning up test environment...');
    
    // Stop cleanup jobs
    await stopCleanupJob();
    
    // Don't disconnect database here - tests manage their own connections
    
    // Clear any remaining timers
    jest.clearAllTimers();
    
    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
    // Don't force exit - let Jest handle it naturally
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions in tests  
process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error);
});