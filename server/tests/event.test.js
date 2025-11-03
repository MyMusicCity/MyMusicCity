const mongoose = require("mongoose");
const Event = require("../models/Event");
const User = require("../models/User");

describe("Event testing", () => {

  it("Event with required fields only", () => {
    // const now = Date.now();
    const event = new Event({
      title: "title",
      // description = '',
      // date: now,
      // location = '',
      // createdBy = null,
      // source = '',
      // createdAt: now
    });
    expect(event.title).toBe("title");
    expect(event.description).toBe(undefined);
    // expect(event.date).toBe(now);
    expect(event.location).toBe(undefined);
    expect(event.createdBy).toBe(null);
    expect(event.source).toBe("manual");
    // expect(event.createdAt).toBe(now);
  });

  it("Event with all fields", () => {
    const now = Date.now();
    const user = new User({
      username: "user",
      email: "user@email.com",
      password: "password" 
    });
    const event = new Event({
      title: "title",
      description: "description",
      // date: now,
      location: "location",
      createdBy: user,
      source: "source",
      createdAt: now
    });
    expect(event.title).toBe("title");
    expect(event.description).toBe("description");
    // expect(event.date).toBe(now);
    expect(event.location).toBe("location");
    expect(event.createdBy).toBe(user);
    expect(event.source).toBe("source");
    // expect(event.createdAt).toBe(now);
  });
});