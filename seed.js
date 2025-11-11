// seed.js
const mongoose = require("./server/mongoose");
require("dotenv").config({ path: "./.env" });

const User = require("./server/models/User");
const Event = require("./server/models/Event");
const Rsvp  = require("./server/models/Rsvp");
const { getEventImage } = require("./server/utils/eventImages");

const mockUsers = [
  { username: "jake",  email: "jake@example.com",  password: "testpass1" },
  { username: "sarah", email: "sarah@example.com", password: "testpass2" },
  { username: "mike",  email: "mike@example.com",  password: "testpass3" },
];

const mockEvents = [
  { 
    title: "Indie Rock Night", 
    description: "Local indie bands showcase their latest tracks in an intimate setting",
    date: new Date("2025-11-01T20:00:00Z"), 
    location: "Downtown Club", 
    createdByUsername: "jake",
    image: getEventImage("Indie Rock Night", "Local indie bands showcase their latest tracks in an intimate setting", 0)
  },
  { 
    title: "Jazz Jam Session", 
    description: "Open mic for jazz players and saxophone enthusiasts",
    date: new Date("2025-11-07T19:30:00Z"), 
    location: "Blue Note Café", 
    createdByUsername: "sarah",
    image: getEventImage("Jazz Jam Session", "Open mic for jazz players and saxophone enthusiasts", 1)
  },
  { 
    title: "Hip-Hop Showcase", 
    description: "Emerging hip-hop artists and rappers take the stage",
    date: new Date("2025-11-15T21:00:00Z"), 
    location: "Warehouse 9", 
    createdByUsername: "mike",
    image: getEventImage("Hip-Hop Showcase", "Emerging hip-hop artists and rappers take the stage", 2)
  },
  {
    title: "Country Music Night",
    description: "Authentic Nashville country music experience with local artists",
    date: new Date("2025-11-22T19:00:00Z"),
    location: "Honky Tonk Central",
    createdByUsername: "jake",
    image: getEventImage("Country Music Night", "Authentic Nashville country music experience with local artists", 3)
  },
  {
    title: "Electronic Dance Party",
    description: "DJ sets and electronic music all night long",
    date: new Date("2025-11-28T22:00:00Z"),
    location: "Club Voltage",
    createdByUsername: "sarah",
    image: getEventImage("Electronic Dance Party", "DJ sets and electronic music all night long", 4)
  }
];

const mockRsvps = [
  { eventTitle: "Indie Rock Night", userUsername: "sarah", status: "going" },
  { eventTitle: "Jazz Jam",        userUsername: "jake",  status: "interested" },
  { eventTitle: "Hip-Hop Showcase",userUsername: "mike",  status: "going" },
];

async function seed() {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");

    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "mymusiccity",
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");
    console.log("Connected to DB:", mongoose.connection.name);

    // Show that models are actually registered on THIS mongoose instance
    console.log("Registered models:", mongoose.modelNames());

    // Ensure indexes (esp. Rsvp unique compound index)
    await Promise.all([
      User.syncIndexes(),
      Event.syncIndexes(),
      Rsvp.syncIndexes(),
    ]);

    // Clear collections (ok if they don't exist yet)
    await Promise.all([
      User.deleteMany({}),
      Event.deleteMany({}),
      Rsvp.deleteMany({}),
    ]);

    const users = await User.insertMany(mockUsers);
    const userByUsername = Object.fromEntries(users.map(u => [u.username, u]));

    const eventsToInsert = mockEvents.map(e => ({
      title: e.title,
      description: e.description,
      date: e.date,
      location: e.location,
      createdBy: userByUsername[e.createdByUsername]._id,
    }));
    const events = await Event.insertMany(eventsToInsert);
    const eventByTitle = Object.fromEntries(events.map(ev => [ev.title, ev]));

    const rsvpsToInsert = mockRsvps.map(r => ({
      event:  eventByTitle[r.eventTitle]._id,
      user:   userByUsername[r.userUsername]._id,
      status: r.status,
    }));
    await Rsvp.insertMany(rsvpsToInsert);

    console.log("Seed complete:");
    console.log(`   Users:  ${users.length}`);
    console.log(`   Events: ${events.length}`);
    console.log(`   RSVPs:  ${rsvpsToInsert.length}`);
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
