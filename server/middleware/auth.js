const jwt = require("jsonwebtoken");

// In production we never allow a fallback secret. Fail-fast during startup if
// JWT_SECRET is missing to prevent issuing trivially forgeable tokens. In test
// environments we allow a deterministic default purely for convenience.
const FALLBACK_TEST_SECRET = "supersecretjwtkey";
const effectiveSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? FALLBACK_TEST_SECRET : null);

if (!effectiveSecret) {
  // This module may be loaded before the main index.js startup check, so we
  // provide a clear message and exit to avoid partial boot.
  console.error("❌ JWT_SECRET is required but missing. Set it in your environment (.env). Aborting.");
  process.exit(1);
}

module.exports = function auth(req, res, next) {
  const header = req.headers && req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Invalid Authorization format" });

  const token = parts[1];
  try {
    const payload = jwt.verify(token, effectiveSecret);
    // Attach a minimal user object to the request
    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
