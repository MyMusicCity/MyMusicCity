const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

// Email sending setup (optional). If SMTP env vars are present we will attempt
// to send real emails; otherwise we will log the verification link to console.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@example.com';

let transporter = null;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // true for 465, false for others
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function sendVerificationEmail(toEmail, link) {
  if (transporter) {
    return transporter.sendMail({
      from: EMAIL_FROM,
      to: toEmail,
      subject: "MyMusicCity — verify your email",
      text: `Please confirm your email by visiting: ${link}`,
      html: `<p>Please confirm your email by clicking <a href="${link}">this link</a>.</p>`,
    });
  }
  // Fallback: log the link (useful in development and CI)
  console.log(`Verification link for ${toEmail}: ${link}`);
  return Promise.resolve();
}

// --- SIGNUP ---
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, year, major } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields are required." });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);

    // Create user as unverified and send verification email. Do NOT issue a
    // login token until the email address is verified.
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const newUser = new User({
      username,
      email,
      password: hashed,
      year,
      major,
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });
    await newUser.save();

    // Build verification link that the user can open in their browser. Prefer
    // FRONTEND_URL if provided so users land on the UI; the UI can then call
    // the backend verify endpoint. As a fallback, point directly to the API.
    const frontend = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:3000";
    const verifyLink = `${frontend.replace(/\/$/, "")}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    // Send or log verification email
    await sendVerificationEmail(email, verifyLink);

    // In development or when no SMTP transporter is configured, include the
    // verification link in the API response to help debugging / onboarding.
    const allowDevVerify = process.env.ALLOW_DEV_VERIFY === "true" || process.env.NODE_ENV !== "production";
    if (!transporter || allowDevVerify) {
      return res.status(201).json({ message: "User created; verification email sent.", verifyLink });
    }

    res.status(201).json({ message: "User created; verification email sent." });
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

    if (!user.emailVerified) return res.status(403).json({ error: "Email not verified. Check your inbox for a verification link." });

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

// Verify email token (can be called from UI)
router.post("/verify-email", async (req, res) => {
  try {
    const { token, email } = req.body || {};
    if (!token || !email) return res.status(400).json({ error: "Missing token or email" });

    const user = await User.findOne({ email, emailVerificationToken: token }).exec();
    if (!user) return res.status(400).json({ error: "Invalid token" });
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date())
      return res.status(400).json({ error: "Token expired" });

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.json({ ok: true, message: "Email verified" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Missing email" });
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailVerified) return res.status(400).json({ error: "Email already verified" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.emailVerificationToken = token;
    user.emailVerificationExpires = expires;
    await user.save();

    const frontend = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:3000";
    const verifyLink = `${frontend.replace(/\/$/, "")}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await sendVerificationEmail(email, verifyLink);

    return res.json({ ok: true, message: "Verification email resent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to resend verification" });
  }
});

module.exports = router;
