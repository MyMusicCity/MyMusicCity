const mongoose = require("mongoose");
const Event = require("../models/Event");
const User = require("../models/User");

describe("Event testing", () => {

  it("Event with required fields only", () => {

    // const now = Date.now();
    const event = new Event({
      title: "title"
      // description: '',
      // date: now,
      // location: '',
      // createdBy: null,
      // source: '',
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

    const now = new Date();

    const user = new User({
      username: "user",
      email: "user@email.com",
      password: "password" 
    });

    const event = new Event({
      title: "title",
      description: "description",
      date: now,
      location: "location",
      createdBy: user,
      source: "source",
      createdAt: now
    });

    expect(event.title).toBe("title");
    expect(event.description).toBe("description");
    expect(event.location).toBe("location");
    expect(event.createdBy).toBe(user);
    expect(event.source).toBe("source");

  });

  it("Two different events", () => {

    const now = new Date();

    const user1 = new User({
      username: "user1",
      email: "user1@email.com",
      password: "password1" 
    });

    const user2 = new User({
      username: "user2",
      email: "user2@email.com",
      password: "password2" 
    });

    const event1 = new Event({
      title: "title1",
      description: "description1",
      date: now,
      location: "location1",
      createdBy: user1,
      source: "source1",
      createdAt: now
    });

    const event2 = new Event({
      title: "title2",
      description: "description2",
      date: now,
      location: "location2",
      createdBy: user2,
      source: "source2",
      createdAt: now
    });

    expect(event1.title).toBe("title1");
    expect(event2.title).toBe("title2");
    expect(event1.description).toBe("description1");
    expect(event2.description).toBe("description2");
    expect(event1.location).toBe("location1");
    expect(event2.location).toBe("location2");
    expect(event1.createdBy).toBe(user1);
    expect(event2.createdBy).toBe(user2);
    expect(event1.source).toBe("source1");
    expect(event2.source).toBe("source2");
    
  });

});
// more redundant tests for close to 100% coverage
// TODO: incomplete events