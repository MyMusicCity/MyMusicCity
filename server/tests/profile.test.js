const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');

describe('Profile System Comprehensive Tests', () => {
  let tempUsers = [];
  
  beforeEach(async () => {
    // Clean up test users
    await User.deleteMany({ email: { $regex: /@test\.temp$|@auth0\.temp$/ } });
    tempUsers = [];
  });

  afterEach(async () => {
    // Clean up any users created during tests
    for (const userId of tempUsers) {
      try {
        await User.findByIdAndDelete(userId);
      } catch (err) {
        console.warn(`Failed to cleanup user ${userId}:`, err.message);
      }
    }
    tempUsers = [];
  });

  describe('Auto-population Issues', () => {
    test('should not auto-populate temporary usernames in profile form', async () => {
      // Create a user with temporary username
      const tempUser = new User({
        username: 'tempuser_04136326_3uho', // This should be detected as temporary
        email: 'user@test.temp',
        password: 'password123',
        auth0Id: 'auth0|test123',
        year: null,
        major: null
      });
      await tempUser.save();
      tempUsers.push(tempUser._id);

      // Create JWT token for this user
      const token = jwt.sign(
        { id: tempUser._id, email: tempUser.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      // Test GET /api/me
      const response = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('tempuser_04136326_3uho');
      expect(response.body.email).toBe('user@test.temp');
      expect(response.body.profileComplete).toBe(false);
    });

    test('should not auto-populate Auth0 temporary emails', async () => {
      // Create a user with Auth0 temporary email
      const tempUser = new User({
        username: 'tempuser2',
        email: 'auth0|user123@auth0.temp', // This should be detected as temporary
        password: 'password123',
        auth0Id: 'auth0|test456',
        year: null,
        major: null
      });
      await tempUser.save();
      tempUsers.push(tempUser._id);

      // Create JWT token for this user
      const token = jwt.sign(
        { id: tempUser._id, email: tempUser.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      // Test GET /api/me
      const response = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('tempuser2');
      expect(response.body.email).toBe('auth0|user123@auth0.temp');
      expect(response.body.profileComplete).toBe(false);
    });
  });

  describe('Username Validation Issues', () => {
    test('should allow new username when updating profile', async () => {
      // Create a user with temporary data
      const tempUser = new User({
        username: 'tempuser',
        email: 'user@test.temp',
        password: 'password123',
        year: null,
        major: null
      });
      await tempUser.save();
      tempUsers.push(tempUser._id);

      // Create JWT token for this user
      const token = jwt.sign(
        { id: tempUser._id, email: tempUser.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      // Test profile update with new username
      const updateData = {
        username: 'newusername123',
        email: 'newemail@vanderbilt.edu',
        year: 'Sophomore',
        major: 'Computer Science'
      };

      const response = await request(app)
        .put('/api/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      console.log('Profile update response:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('newusername123');
      expect(response.body.user.email).toBe('newemail@vanderbilt.edu');
      expect(response.body.profileComplete).toBe(true);
      expect(response.body.justCompleted).toBe(true);
    });

    test('should reject username that already exists', async () => {
      // Create first user
      const user1 = new User({
        username: 'existinguser',
        email: 'user1@test.temp',
        password: 'password123',
        year: 'Junior',
        major: 'Music'
      });
      await user1.save();
      tempUsers.push(user1._id);

      // Create second user
      const user2 = new User({
        username: 'tempuser',
        email: 'user2@test.temp', 
        password: 'password123',
        year: null,
        major: null
      });
      await user2.save();
      tempUsers.push(user2._id);

      // Create JWT token for second user
      const token = jwt.sign(
        { id: user2._id, email: user2.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      // Try to update to existing username
      const updateData = {
        username: 'existinguser', // This username already exists
        email: 'user2new@vanderbilt.edu',
        year: 'Sophomore', 
        major: 'Computer Science'
      };

      const response = await request(app)
        .put('/api/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      console.log('Username conflict response:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('USERNAME_TAKEN');
      expect(response.body.message).toContain('Username already taken');
    });

    test('should handle username sanitization correctly', async () => {
      // Create a user with temporary data
      const tempUser = new User({
        username: 'tempuser',
        email: 'user@test.temp',
        password: 'password123',
        year: null,
        major: null
      });
      await tempUser.save();
      tempUsers.push(tempUser._id);

      // Create JWT token for this user
      const token = jwt.sign(
        { id: tempUser._id, email: tempUser.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      // Test username sanitization - spaces, special chars, etc.
      const updateData = {
        username: '  New User 123!@#  ',  // This should become 'newuser123'
        email: 'newemail@vanderbilt.edu',
        year: 'Sophomore',
        major: 'Computer Science'
      };

      const response = await request(app)
        .put('/api/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      console.log('Username sanitization response:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('newuser123'); // Should be sanitized
    });

    test('should reject username that is too short after sanitization', async () => {
      // Create a user with temporary data
      const tempUser = new User({
        username: 'tempuser',
        email: 'user@test.temp',
        password: 'password123',
        year: null,
        major: null
      });
      await tempUser.save();
      tempUsers.push(tempUser._id);

      // Create JWT token for this user
      const token = jwt.sign(
        { id: tempUser._id, email: tempUser.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      // Test username that becomes too short after sanitization
      const updateData = {
        username: '  a!@#  ',  // This should become 'a' which is too short
        email: 'newemail@vanderbilt.edu',
        year: 'Sophomore', 
        major: 'Computer Science'
      };

      const response = await request(app)
        .put('/api/me/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      console.log('Short username response:', response.body);

      // Should still work but username shouldn't change because it's too short
      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('tempuser'); // Should remain unchanged
    });
  });

  describe('Race Condition Tests', () => {
    test('should handle concurrent profile updates correctly', async () => {
      // Create a user with temporary data
      const tempUser = new User({
        username: 'tempuser',
        email: 'user@test.temp',
        password: 'password123',
        year: null,
        major: null
      });
      await tempUser.save();
      tempUsers.push(tempUser._id);

      // Create JWT token for this user
      const token = jwt.sign(
        { id: tempUser._id, email: tempUser.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      // Send multiple concurrent requests
      const updateData = {
        username: 'raceuser',
        email: 'race@vanderbilt.edu',
        year: 'Sophomore',
        major: 'Computer Science'
      };

      const promises = Array(5).fill(null).map(() => 
        request(app)
          .put('/api/me/profile')
          .set('Authorization', `Bearer ${token}`)
          .send(updateData)
      );

      const results = await Promise.all(promises);

      // All should succeed (idempotent updates)
      for (const result of results) {
        expect(result.status).toBe(200);
        expect(result.body.user.username).toBe('raceuser');
      }
    });
  });

  describe('Profile Completion Logic', () => {
    test('should correctly identify incomplete profiles', async () => {
      // Test various combinations of missing fields
      const incompleteUsers = [
        { username: 'user1', email: 'user1@test.temp', year: null, major: 'CS' },
        { username: 'user2', email: 'user2@test.temp', year: 'Junior', major: null },
        { username: 'user3', email: 'user3@test.temp', year: null, major: null }
      ];

      for (const userData of incompleteUsers) {
        const user = new User({
          ...userData,
          password: 'password123'
        });
        await user.save();
        tempUsers.push(user._id);

        const token = jwt.sign(
          { id: user._id, email: user.email },
          process.env.JWT_SECRET || 'supersecretjwtkey'
        );

        const response = await request(app)
          .get('/api/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.profileComplete).toBe(false);
      }
    });

    test('should correctly identify complete profiles', async () => {
      const completeUser = new User({
        username: 'completeuser',
        email: 'complete@test.temp',
        password: 'password123',
        year: 'Senior',
        major: 'Music Theory'
      });
      await completeUser.save();
      tempUsers.push(completeUser._id);

      const token = jwt.sign(
        { id: completeUser._id, email: completeUser.email },
        process.env.JWT_SECRET || 'supersecretjwtkey'
      );

      const response = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.profileComplete).toBe(true);
    });
  });
});