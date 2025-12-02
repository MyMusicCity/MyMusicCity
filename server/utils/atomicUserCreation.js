const mongoose = require('mongoose');
const User = require('../models/User');

// Global counter collection for atomic username generation
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0 }
});
// Don't add index on _id as MongoDB creates it automatically

const Counter = mongoose.model('Counter', CounterSchema);

/**
 * Account creation states for proper state machine transitions
 */
const ACCOUNT_STATES = {
  CREATING: 'creating',
  PENDING: 'pending', 
  ACTIVE: 'active',
  COMPLETE: 'complete',
  ERROR: 'error'
};

/**
 * Generate next unique username atomically using MongoDB counters
 * This eliminates race conditions in username generation
 */
async function getNextTempUsername(session) {
  try {
    const result = await Counter.findOneAndUpdate(
      { _id: 'tempuser_counter' },
      { $inc: { sequence: 1 } },
      { 
        new: true, 
        upsert: true, 
        session,
        // Ensure atomic operation with write concern
        writeConcern: { w: 'majority', j: true }
      }
    );
    
    if (result.sequence === 1) {
      return 'tempuser';
    }
    
    return `tempuser${result.sequence}`;
  } catch (error) {
    console.error('Failed to generate temp username:', error);
    // Fallback to timestamp-based username if counter fails
    return `tempuser_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substr(2, 4)}`;
  }
}

/**
 * Create idempotency token for user creation operations
 * This ensures duplicate requests don't create multiple users
 */
function createIdempotencyKey(auth0Id, email) {
  const crypto = require('crypto');
  const normalizedEmail = email.toLowerCase().trim();
  const dataToHash = `${auth0Id}:${normalizedEmail}:user_creation`;
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Atomically find or create Auth0 user with comprehensive error handling
 * This function is designed to be completely race-condition free
 */
async function findOrCreateAuth0UserAtomic(auth0Id, email, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 100; // Start with 100ms, exponential backoff
  
  if (retryCount >= MAX_RETRIES) {
    throw new Error(`USER_CREATION_FAILED: Maximum retries (${MAX_RETRIES}) exceeded`);
  }

  // Validate required parameters with comprehensive checks
  if (!auth0Id || typeof auth0Id !== 'string' || auth0Id.trim().length === 0) {
    throw new Error('INVALID_AUTH0_ID: Auth0 ID is required and must be a non-empty string');
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('INVALID_EMAIL: Valid email is required');
  }
  
  // Additional validation for malformed inputs
  const trimmedAuth0Id = auth0Id.trim();
  if (trimmedAuth0Id.length > 255) {
    throw new Error('INVALID_AUTH0_ID: Auth0 ID too long (max 255 characters)');
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.toLowerCase().trim();
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('INVALID_EMAIL: Email format is invalid');
  }
  
  if (normalizedEmail.length > 254) {
    throw new Error('INVALID_EMAIL: Email too long (max 254 characters)');
  }
  
  const idempotencyKey = createIdempotencyKey(trimmedAuth0Id, normalizedEmail);
  
  console.log(`🔄 Attempting user creation/lookup (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, {
    auth0Id: trimmedAuth0Id,
    email: normalizedEmail,
    idempotencyKey: idempotencyKey.substr(0, 8) + '...'
  });

  const session = await mongoose.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      // Step 1: Check for existing user by auth0Id (highest priority)
      let existingUser = await User.findOne({ auth0Id: trimmedAuth0Id }).session(session);
      if (existingUser) {
        console.log('✅ Found existing user by auth0Id:', {
          username: existingUser.username,
          state: existingUser.accountState,
          created: existingUser.createdAt
        });
        return existingUser;
      }

      // Step 2: Check for account creation in progress with same idempotency key
      existingUser = await User.findOne({ 
        idempotencyKey,
        accountState: { $in: [ACCOUNT_STATES.CREATING, ACCOUNT_STATES.PENDING] }
      }).session(session);
      
      if (existingUser) {
        console.log('⏳ Found user creation in progress, returning existing user:', existingUser.username);
        return existingUser;
      }

      // Step 3: Check for existing user by email (for migration/linking)
      existingUser = await User.findOne({ 
        email: normalizedEmail 
      }).session(session);
      
      if (existingUser) {
        if (!existingUser.auth0Id) {
          console.log('🔗 Linking existing account with Auth0 ID:', existingUser.username);
          
          // Atomically link existing account with Auth0
          existingUser.auth0Id = trimmedAuth0Id;
          existingUser.idempotencyKey = idempotencyKey;
          existingUser.accountState = ACCOUNT_STATES.ACTIVE;
          existingUser.auth0LinkedAt = new Date();
          
          await existingUser.save({ session });
          console.log('✅ Successfully linked existing account with Auth0');
          return existingUser;
          
        } else if (existingUser.auth0Id !== trimmedAuth0Id) {
          // Account conflict: same email but different auth0Id
          console.error('⚠️ Account conflict detected:', {
            existingAuth0Id: existingUser.auth0Id,
            attemptedAuth0Id: trimmedAuth0Id,
            email: normalizedEmail
          });
          throw new Error(`ACCOUNT_CONFLICT: Email ${normalizedEmail} is already associated with a different Auth0 account (${existingUser.auth0Id}). Please use account cleanup or contact support.`);
        }
      }

      // Step 4: Create new user with atomic operations
      console.log('🆕 Creating new Auth0 user...');
      
      // Generate unique username atomically
      const tempUsername = await getNextTempUsername(session);
      
      // Prepare new user data with state machine
      const newUserData = {
        username: tempUsername,
        email: normalizedEmail,
        password: 'auth0-user', // Placeholder for Auth0 users
        auth0Id: trimmedAuth0Id,
        idempotencyKey: idempotencyKey,
        accountState: ACCOUNT_STATES.CREATING,
        year: null,
        major: null,
        createdAt: new Date(),
        auth0CreatedAt: new Date(),
        isProfileComplete: false,
        // Add metadata for debugging and monitoring
        creationMetadata: {
          userAgent: process.env.NODE_ENV === 'development' ? 'dev-server' : 'prod-server',
          ipAddress: 'server-side',
          retryCount: retryCount,
          creationMethod: 'atomic-auth0'
        }
      };

      const newUser = new User(newUserData);
      await newUser.save({ session });
      
      // Immediately transition to PENDING state
      newUser.accountState = ACCOUNT_STATES.PENDING;
      newUser.accountStateTransitions = [{
        from: ACCOUNT_STATES.CREATING,
        to: ACCOUNT_STATES.PENDING,
        timestamp: new Date(),
        reason: 'initial_creation_complete'
      }];
      
      await newUser.save({ session });
      
      console.log('✅ Successfully created new Auth0 user:', {
        username: tempUsername,
        auth0Id: trimmedAuth0Id,
        email: normalizedEmail,
        state: ACCOUNT_STATES.PENDING,
        idempotencyKey: idempotencyKey.substr(0, 8) + '...'
      });
      
      return newUser;
      
    }, {
      // Transaction options for maximum consistency
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority', j: true },
      maxTimeMS: 10000 // 10 second timeout
    });
    
    // Transition to ACTIVE state outside transaction for performance
    if (result && result.accountState === ACCOUNT_STATES.PENDING) {
      try {
        await User.findByIdAndUpdate(
          result._id,
          { 
            accountState: ACCOUNT_STATES.ACTIVE,
            $push: {
              accountStateTransitions: {
                from: ACCOUNT_STATES.PENDING,
                to: ACCOUNT_STATES.ACTIVE,
                timestamp: new Date(),
                reason: 'post_creation_activation'
              }
            }
          },
          { new: true }
        );
        result.accountState = ACCOUNT_STATES.ACTIVE;
        console.log(`✅ User ${result.username} activated successfully`);
      } catch (activationError) {
        console.warn('⚠️ Failed to activate user, but creation succeeded:', activationError.message);
        // User creation succeeded, activation failure is not critical
      }
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error in atomic user creation (attempt ${retryCount + 1}):`, {
      error: error.message,
      auth0Id: trimmedAuth0Id,
      email: normalizedEmail,
      errorCode: error.code,
      errorName: error.name
    });
    
    // Handle specific error types with retry logic
    if (error.code === 11000) {
      // Duplicate key error - might be resolved by retry
      console.log(`🔄 Duplicate key error, retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)));
      return findOrCreateAuth0UserAtomic(auth0Id, email, retryCount + 1);
    }
    
    if (error.message.includes('ACCOUNT_CONFLICT')) {
      throw error; // Don't retry account conflicts
    }
    
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      // Network/server errors might be transient
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Database error, retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)));
        return findOrCreateAuth0UserAtomic(auth0Id, email, retryCount + 1);
      }
    }
    
    // Mark user creation as failed for cleanup
    if (error.auth0Id && error.idempotencyKey) {
      try {
        await User.findOneAndUpdate(
          { idempotencyKey: error.idempotencyKey },
          { 
            accountState: ACCOUNT_STATES.ERROR,
            lastError: error.message,
            $push: {
              accountStateTransitions: {
                from: 'unknown',
                to: ACCOUNT_STATES.ERROR,
                timestamp: new Date(),
                reason: 'creation_failed',
                error: error.message
              }
            }
          }
        );
      } catch (cleanupError) {
        console.warn('Failed to mark user creation as failed:', cleanupError.message);
      }
    }
    
    throw new Error(`USER_CREATION_FAILED: ${error.message}`);
    
  } finally {
    await session.endSession();
  }
}

/**
 * Cleanup orphaned or failed user creation attempts
 * This should be called periodically to maintain database health
 */
async function cleanupOrphanedUsers() {
  const cutoffTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
  
  try {
    console.log('🧹 Starting orphaned user cleanup...');
    
    // Check if database connection is healthy
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database not connected, skipping cleanup');
      return { skipped: true, reason: 'database_not_connected' };
    }
    
    // Find users stuck in CREATING state for more than 15 minutes
    const orphanedUsers = await User.find({
      accountState: ACCOUNT_STATES.CREATING,
      createdAt: { $lt: cutoffTime }
    }).limit(100); // Limit batch size for performance
    
    console.log(`Found ${orphanedUsers.length} orphaned users to cleanup`);
    
    const cleanupResults = {
      orphanedCleaned: 0,
      errorsCleaned: 0,
      errors: []
    };
    
    // Cleanup orphaned users in batches
    if (orphanedUsers.length > 0) {
      try {
        const orphanedIds = orphanedUsers.map(u => u._id);
        const deleteResult = await User.deleteMany({ _id: { $in: orphanedIds } });
        cleanupResults.orphanedCleaned = deleteResult.deletedCount;
        console.log(`✅ Cleaned up ${deleteResult.deletedCount} orphaned users`);
      } catch (deleteError) {
        console.error('❌ Failed to delete orphaned users:', deleteError.message);
        cleanupResults.errors.push(`Orphaned deletion failed: ${deleteError.message}`);
      }
    }
    
    // Also cleanup users in ERROR state older than 1 hour
    const errorCutoffTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const errorUsers = await User.find({
      accountState: ACCOUNT_STATES.ERROR,
      createdAt: { $lt: errorCutoffTime }
    }).limit(100);
    
    console.log(`Found ${errorUsers.length} error users to cleanup`);
    
    if (errorUsers.length > 0) {
      try {
        const errorIds = errorUsers.map(u => u._id);
        const deleteResult = await User.deleteMany({ _id: { $in: errorIds } });
        cleanupResults.errorsCleaned = deleteResult.deletedCount;
        console.log(`✅ Cleaned up ${deleteResult.deletedCount} error users`);
      } catch (deleteError) {
        console.error('❌ Failed to delete error users:', deleteError.message);
        cleanupResults.errors.push(`Error deletion failed: ${deleteError.message}`);
      }
    }
    
    console.log('✅ Orphaned user cleanup completed:', cleanupResults);
    return cleanupResults;
    
  } catch (error) {
    console.error('❌ Failed to cleanup orphaned users:', error.message);
    return { error: error.message, completed: false };
  }
}

module.exports = {
  findOrCreateAuth0UserAtomic,
  cleanupOrphanedUsers,
  ACCOUNT_STATES,
  createIdempotencyKey
};