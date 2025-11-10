const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "vanderbilt.edu").toLowerCase();

function emailAllowed(email) {
  if (!email || typeof email !== "string") return false;
  return email.toLowerCase().endsWith("@" + ALLOWED_EMAIL_DOMAIN);
}

// --- SIGNUP ---
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, year, major } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields are required." });

    // Enforce institutional email domain for signups
    if (!emailAllowed(email))
      return res.status(403).json({ error: `Signups are limited to ${ALLOWED_EMAIL_DOMAIN} email addresses.` });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashed, year, major });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || "supersecretjwtkey",
      { expiresIn: "3h" }
    );

    res.status(201).json({
      message: "User created successfully!",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        year: newUser.year,
        major: newUser.major,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed." });
  }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // Only allow logins from the configured institutional domain
    if (!emailAllowed(email))
      return res.status(403).json({ error: `Login is restricted to ${ALLOWED_EMAIL_DOMAIN} email addresses.` });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "supersecretjwtkey",
      { expiresIn: "3h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        year: user.year,
        major: user.major,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed." });
  }
});

module.exports = router;
