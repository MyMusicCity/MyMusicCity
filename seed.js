// seed.js
const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });


const User = require("./server/models/User");
const Event = require("./server/models/Event");
const Rsvp = require("./server/models/Rsvp");

const mockUsers = [
  { username: "jake",  email: "jake@example.com",  password: "testpass1" },
  { username: "sarah", email: "sarah@example.com", password: "testpass2" },
  { username: "mike",  email: "mike@example.com",  password: "testpass3" },
];

const mockEvents = [
  { title: "Indie Rock Night", description: "Local indie bands showcase",
    date: new Date("2025-11-01T20:00:00Z"), location: "Downtown Club", createdByUsername: "jake" },
  { title: "Jazz Jam", description: "Open mic for jazz players",
    date: new Date("2025-11-07T19:30:00Z"), location: "Blue Note Café", createdByUsername: "sarah" },
  { title: "Hip-Hop Showcase", description: "Emerging hip-hop artists",
    date: new Date("2025-11-15T21:00:00Z"), location: "Warehouse 9", createdByUsername: "mike" },
];

const mockRsvps = [
  { eventTitle: "Indie Rock Night", userUsername: "sarah", status: "going" },
  { eventTitle: "Jazz Jam",        userUsername: "jake",  status: "interested" },
  { eventTitle: "Hip-Hop Showcase",userUsername: "mike",  status: "going" },
];

async function seed() {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");
    await mongoose.connect(process.env.MONGO_URI);

    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Rsvp.deleteMany({})
    ]);

    const users = await User.insertMany(mockUsers);
    const userByUsername = Object.fromEntries(users.map(u => [u.username, u]));

    const eventsToInsert = mockEvents.map(e => ({
      title: e.title,
      description: e.description,
      date: e.date,
      location: e.location,
      createdBy: userByUsername[e.createdByUsername]._id
    }));
    const events = await Event.insertMany(eventsToInsert);
    const eventByTitle = Object.fromEntries(events.map(ev => [ev.title, ev]));

    const rsvpsToInsert = mockRsvps.map(r => ({
      event: eventByTitle[r.eventTitle]._id,
      user:  userByUsername[r.userUsername]._id,
      status: r.status
    }));
    await Rsvp.insertMany(rsvpsToInsert);

    console.log("✅ Seed complete:");
    console.log(`   Users:    ${users.length}`);
    console.log(`   Events:   ${events.length}`);
    console.log(`   RSVPs:    ${rsvpsToInsert.length}`);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
