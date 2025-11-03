const mongoose = require("mongoose");
const User = require("../models/User");

describe("User testing", () => {

  it("User with required fields only", () => {

    const user = new User({
      username: "user",
      email: "user@email.com",
      password: "password" 
    });

    expect(user.username).toBe("user");
    expect(user.email).toBe("user@email.com");
    expect(user.password).toBe("password");

  });

  it("User with all fields", () => {

    const now = Date.now();

    const user = new User({
      username: "user",
      email: "user@email.com",
      password: "password",
      createdAt: now
    });

    expect(user.username).toBe("user");
    expect(user.email).toBe("user@email.com");
    expect(user.password).toBe("password");

  });

  it("Two different users", () => {

    const now = Date.now();

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

    expect(user1.username).toBe("user1");
    expect(user1.email).toBe("user1@email.com");
    expect(user1.password).toBe("password1");

    expect(user2.username).toBe("user2");
    expect(user2.email).toBe("user2@email.com");
    expect(user2.password).toBe("password2");
    
  });

});

// more redundant tests for close to 100% coverage
// TODO: incomplete fields