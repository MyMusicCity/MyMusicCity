/**
 * Email validation utilities for Vanderbilt domain handling
 * Centralized email validation logic to ensure consistency across the application
 */

/**
 * Check if an email is a valid Vanderbilt email address
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if it's a valid vanderbilt.edu email
 */
function isVanderbiltEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  return normalizedEmail.endsWith('@vanderbilt.edu');
}

/**
 * Validate and process an email with Vanderbilt auto-approval
 * @param {string} email - The email address to validate
 * @returns {object} - Validation result with details
 */
function validateEmailWithVanderbiltApproval(email) {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      isVanderbilt: false,
      approved: false,
      normalizedEmail: null,
      reason: 'Email is required and must be a string'
    };
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      isValid: false,
      isVanderbilt: false,
      approved: false,
      normalizedEmail: normalizedEmail,
      reason: 'Invalid email format'
    };
  }
  
  const isVanderbilt = isVanderbiltEmail(normalizedEmail);
  
  return {
    isValid: true,
    isVanderbilt: isVanderbilt,
    approved: isVanderbilt, // Auto-approve all Vanderbilt emails
    normalizedEmail: normalizedEmail,
    reason: isVanderbilt ? 'Auto-approved Vanderbilt email' : 'Non-Vanderbilt email (manual approval may be required)'
  };
}

/**
 * Log email validation result for monitoring
 * @param {object} validationResult - Result from validateEmailWithVanderbiltApproval
 * @param {string} context - Context where validation is happening (e.g., 'signup', 'auth')
 */
function logEmailValidation(validationResult, context = 'unknown') {
  const { normalizedEmail, isVanderbilt, approved, reason } = validationResult;
  
  if (approved) {
    if (isVanderbilt) {
      console.log(`✅ [${context}] Auto-approved Vanderbilt email: ${normalizedEmail}`);
    } else {
      console.log(`✅ [${context}] Approved email: ${normalizedEmail} - ${reason}`);
    }
  } else {
    console.log(`❌ [${context}] Email validation failed: ${normalizedEmail} - ${reason}`);
  }
}

module.exports = {
  isVanderbiltEmail,
  validateEmailWithVanderbiltApproval,
  logEmailValidation
};