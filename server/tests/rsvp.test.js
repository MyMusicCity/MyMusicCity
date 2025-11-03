const mongoose = require("mongoose");
const Event = require("../models/Event");
const User = require("../models/User");
const Rsvp = require("../models/Rsvp");

describe("RSVP testing", () => {

  it("RSVP with required fields only", () => {

    const event = new Event({
        title: "title"
    });

    const user = new User({
      username: "user",
      email: "user@email.com",
      password: "password" 
    });

    const rsvp = new Rsvp({
      event: event,
      user: user
    });

    expect(rsvp.event).toBe(event);
    expect(rsvp.user).toBe(user);
    expect(rsvp.status).toBe("interested");

  });

  it("RSVP with all fields", () => {

    const now = new Date();

    const event = new Event({
      title: "title"
    });

    const user = new User({
      username: "user",
      email: "user@email.com",
      password: "password" 
    });

    const rsvpGoing = new Rsvp({
      event: event,
      user: user,
      status: "going",
      createdAt: now
    }); 

    expect(rsvpGoing.event).toBe(event);
    expect(rsvpGoing.user).toBe(user);
    expect(rsvpGoing.status).toBe("going");

  });

  it("Three different events", () => {

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

    const user3 = new User({
      username: "user3",
      email: "user3@email.com",
      password: "password3" 
    });

    const event1 = new Event({
      title: "title1"
    });

    const event2 = new Event({
      title: "title2"
    });

    const event3 = new Event({
      title: "title3"
    });

    const rsvpGoing = new Rsvp({
      event: event1,
      user: user1,
      status: "going",
      createdAt: now
    }); 

    const rsvpInterested = new Rsvp({
      event: event2,
      user: user2,
      status: "interested",
      createdAt: now
    }); 

    const rsvpNotGoing = new Rsvp({
      event: event3,
      user: user3,
      status: "not_going",
      createdAt: now
    }); 

    expect(rsvpGoing.event).toBe(event1);
    expect(rsvpGoing.user).toBe(user1);
    expect(rsvpGoing.status).toBe("going");

    expect(rsvpInterested.event).toBe(event2);
    expect(rsvpInterested.user).toBe(user2);
    expect(rsvpInterested.status).toBe("interested");

    expect(rsvpNotGoing.event).toBe(event3);
    expect(rsvpNotGoing.user).toBe(user3);
    expect(rsvpNotGoing.status).toBe("not_going");

  });

});