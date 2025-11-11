const mongoose = require('mongoose');
const request = require('supertest');

let mongod; // only used if we start an in-memory server
let app;

const User = require('../../models/User');
const Event = require('../../models/Event');

describe('RSVP integration (signup -> rsvp -> attendees)', () => {
  beforeAll(async () => {
    // Prefer a real MongoDB when TEST_MONGO_URI is provided (e.g. CI).
    // This avoids launching mongodb-memory-server which needs platform-specific
    // mongod binaries (and can fail when libcrypto.so.1.1 is missing).
    const testUri = process.env.TEST_MONGO_URI;
    if (testUri) {
      await mongoose.connect(testUri, { dbName: 'testdb' });
    } else {
      // Fallback to mongodb-memory-server for local developer convenience.
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { dbName: 'testdb' });
    }

    // require the app after mongoose connection so models share the connected mongoose
    app = require('../../app');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('should signup, create event, rsvp and list attendee', async () => {
  const email = 'inttest@example.com';
    const username = 'intuser';
    const password = 'password123';

    // Signup
    const signupRes = await request(app)
      .post('/api/signup')
      .send({ username, email, password })
      .expect(201);
    
    // After signup, user is immediately ready to login (no email verification needed)
    const created = await User.findOne({ email }).exec();
    expect(created).toBeTruthy();

    // Now login to obtain JWT
    const loginRes = await request(app).post('/api/login').send({ email, password }).expect(200);
    const token = loginRes.body.token;

    // Create an event directly via model (no public create endpoint)
    const event = await Event.create({ title: 'Integration Event', date: new Date(), location: 'Test Hall' });

    // Post RSVP using token
    const rsvpRes = await request(app)
      .post('/api/rsvps')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: event._id.toString(), status: 'going' })
      .expect(201);

    expect(rsvpRes.body).toHaveProperty('event');
    expect(rsvpRes.body.event.title).toBe('Integration Event');
    expect(rsvpRes.body).toHaveProperty('user');
    expect(rsvpRes.body.user.email).toBe(email);

    // Duplicate RSVP should return 400
    await request(app)
      .post('/api/rsvps')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: event._id.toString(), status: 'going' })
      .expect(400);

    // Fetch attendees for the event
    const attendeesRes = await request(app)
      .get(`/api/rsvps/event/${event._id.toString()}`)
      .expect(200);

    expect(Array.isArray(attendeesRes.body)).toBe(true);
    expect(attendeesRes.body.length).toBeGreaterThanOrEqual(1);
    const attendee = attendeesRes.body.find((a) => a.user && a.user.email === email);
    expect(attendee).toBeDefined();
  });
});
