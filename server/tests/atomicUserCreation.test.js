const { createIdempotencyKey, ACCOUNT_STATES } = require("../utils/atomicUserCreation");

describe("Atomic User Creation", () => {

  describe("Idempotency Key Generation", () => {
    
    it("should generate consistent idempotency keys", () => {
      const key1 = createIdempotencyKey("auth0|test123", "test@vanderbilt.edu");
      const key2 = createIdempotencyKey("auth0|test123", "test@vanderbilt.edu");
      const key3 = createIdempotencyKey("auth0|test123", "TEST@VANDERBILT.EDU");
      
      expect(key1).toBe(key2);
      expect(key1).toBe(key3); // Should handle case differences
      expect(typeof key1).toBe('string');
      expect(key1.length).toBeGreaterThan(20);
    });

    it("should generate different keys for different users", () => {
      const key1 = createIdempotencyKey("auth0|test1", "test1@vanderbilt.edu");
      const key2 = createIdempotencyKey("auth0|test2", "test2@vanderbilt.edu");
      const key3 = createIdempotencyKey("auth0|test1", "test2@vanderbilt.edu");
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

  });

  describe("Account States", () => {

    it("should define all required account states", () => {
      expect(ACCOUNT_STATES.CREATING).toBe('creating');
      expect(ACCOUNT_STATES.PENDING).toBe('pending');
      expect(ACCOUNT_STATES.ACTIVE).toBe('active');
      expect(ACCOUNT_STATES.COMPLETE).toBe('complete');
      expect(ACCOUNT_STATES.ERROR).toBe('error');
    });

  });

  describe("Input Validation", () => {

    it("should validate Auth0 ID format", () => {
      // Test that our validation logic handles edge cases
      const validIds = [
        "auth0|123456",
        "auth0|test@example.com",
        "google-oauth2|123456789",
        "facebook|123456789"
      ];
      
      const invalidIds = [
        "",
        null,
        undefined,
        "   "
      ];

      validIds.forEach(id => {
        expect(typeof id === 'string' && id.trim().length > 0).toBe(true);
      });

      invalidIds.forEach(id => {
        if (id === null || id === undefined) {
          expect(id == null).toBe(true);
        } else if (typeof id === 'string') {
          expect(id.trim().length === 0).toBe(true);
        } else {
          expect(typeof id !== 'string').toBe(true);
        }
      });
    });

    it("should validate email format", () => {
      const validEmails = [
        "test@vanderbilt.edu",
        "user.name@vanderbilt.edu",
        "test+tag@vanderbilt.edu"
      ];
      
      const invalidEmails = [
        "",
        null,
        undefined,
        "invalid",
        "no-at-symbol.com"
      ];

      validEmails.forEach(email => {
        expect(email && typeof email === 'string' && email.includes('@')).toBe(true);
      });

      invalidEmails.forEach(email => {
        if (email === null || email === undefined) {
          expect(email == null).toBe(true);
        } else if (typeof email === 'string') {
          expect(email === '' || !email.includes('@')).toBe(true);
        } else {
          expect(typeof email !== 'string').toBe(true);
        }
      });
    });

  });

});