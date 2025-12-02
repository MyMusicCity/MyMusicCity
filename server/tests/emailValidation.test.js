/**
 * Tests for email validation utilities
 * Tests Vanderbilt email auto-approval functionality
 */

const { 
  isVanderbiltEmail, 
  validateEmailWithVanderbiltApproval, 
  logEmailValidation 
} = require('../utils/emailValidation');

describe('Email Validation Utilities', () => {
  describe('isVanderbiltEmail', () => {
    test('should identify Vanderbilt emails correctly', () => {
      expect(isVanderbiltEmail('student@vanderbilt.edu')).toBe(true);
      expect(isVanderbiltEmail('STUDENT@VANDERBILT.EDU')).toBe(true);
      expect(isVanderbiltEmail('test.user@vanderbilt.edu')).toBe(true);
      expect(isVanderbiltEmail('user+tag@vanderbilt.edu')).toBe(true);
    });

    test('should reject non-Vanderbilt emails', () => {
      expect(isVanderbiltEmail('student@gmail.com')).toBe(false);
      expect(isVanderbiltEmail('user@vanderbilt.com')).toBe(false);
      expect(isVanderbiltEmail('test@yahoo.com')).toBe(false);
      expect(isVanderbiltEmail('')).toBe(false);
      expect(isVanderbiltEmail(null)).toBe(false);
      expect(isVanderbiltEmail(undefined)).toBe(false);
    });
  });

  describe('validateEmailWithVanderbiltApproval', () => {
    test('should auto-approve valid Vanderbilt emails', () => {
      const result = validateEmailWithVanderbiltApproval('student@vanderbilt.edu');
      
      expect(result.isValid).toBe(true);
      expect(result.isVanderbilt).toBe(true);
      expect(result.approved).toBe(true);
      expect(result.normalizedEmail).toBe('student@vanderbilt.edu');
      expect(result.reason).toBe('Auto-approved Vanderbilt email');
    });

    test('should handle case-insensitive Vanderbilt emails', () => {
      const result = validateEmailWithVanderbiltApproval('STUDENT@VANDERBILT.EDU');
      
      expect(result.isValid).toBe(true);
      expect(result.isVanderbilt).toBe(true);
      expect(result.approved).toBe(true);
      expect(result.normalizedEmail).toBe('student@vanderbilt.edu');
    });

    test('should validate but not auto-approve non-Vanderbilt emails', () => {
      const result = validateEmailWithVanderbiltApproval('user@gmail.com');
      
      expect(result.isValid).toBe(true);
      expect(result.isVanderbilt).toBe(false);
      expect(result.approved).toBe(false);
      expect(result.normalizedEmail).toBe('user@gmail.com');
      expect(result.reason).toContain('Non-Vanderbilt email');
    });

    test('should reject invalid email formats', () => {
      const testCases = [
        { email: 'invalid-email', expectedReason: 'Invalid email format' },
        { email: 'user@', expectedReason: 'Invalid email format' },
        { email: '@domain.com', expectedReason: 'Invalid email format' },
        { email: 'user.domain.com', expectedReason: 'Invalid email format' },
        { email: '', expectedReason: 'Email is required and must be a string' }
      ];
      
      testCases.forEach(({ email, expectedReason }) => {
        const result = validateEmailWithVanderbiltApproval(email);
        expect(result.isValid).toBe(false);
        expect(result.isVanderbilt).toBe(false);
        expect(result.approved).toBe(false);
        expect(result.reason).toBe(expectedReason);
      });
    });

    test('should handle null/undefined inputs gracefully', () => {
      const nullResult = validateEmailWithVanderbiltApproval(null);
      const undefinedResult = validateEmailWithVanderbiltApproval(undefined);
      
      [nullResult, undefinedResult].forEach(result => {
        expect(result.isValid).toBe(false);
        expect(result.isVanderbilt).toBe(false);
        expect(result.approved).toBe(false);
        expect(result.reason).toBe('Email is required and must be a string');
      });
    });
  });

  describe('logEmailValidation', () => {
    test('should not throw errors when logging validation results', () => {
      const result = validateEmailWithVanderbiltApproval('student@vanderbilt.edu');
      
      // Should not throw
      expect(() => {
        logEmailValidation(result, 'test');
      }).not.toThrow();
    });
  });
});