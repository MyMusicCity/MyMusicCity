const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

let mongod;
let app;

const User = require('../../models/User');
const Event = require('../../models/Event');

describe('RSVP integration (signup -> rsvp -> attendees)', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { dbName: 'testdb' });
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

    expect(signupRes.body).toHaveProperty('token');
    const token = signupRes.body.token;

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
