const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validateEmailWithVanderbiltApproval, logEmailValidation } = require("../utils/emailValidation");

const router = express.Router();

// --- SIGNUP ---
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, year, major } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields are required." });

    // Comprehensive email validation with Vanderbilt auto-approval
    const emailValidation = validateEmailWithVanderbiltApproval(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        error: "Invalid email format.",
        details: emailValidation.reason 
      });
    }
    
    // Log email validation result for monitoring
    logEmailValidation(emailValidation, 'signup');
    
    const normalizedEmail = emailValidation.normalizedEmail;

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser)
      return res.status(400).json({ error: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email: normalizedEmail,
      password: hashed,
      year,
      major,
    });
    await newUser.save();

    res.status(201).json({ 
      message: "User created successfully.",
      emailApproved: emailValidation.approved,
      emailType: emailValidation.isVanderbilt ? 'vanderbilt' : 'external',
      autoApproved: emailValidation.isVanderbilt
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
