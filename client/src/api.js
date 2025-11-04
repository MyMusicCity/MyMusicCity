// client/src/api.js
const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

// --- Safe health check (won't break UI) ---
export async function ping() {
  if (!API_BASE) return { ok: false, reason: "no API base url configured" };
  try {
    const res = await fetch(`${API_BASE}/healthz`, { credentials: "include" });
    if (!res.ok) return { ok: false, status: res.status };
    return res.json(); // { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || "network error" };
  }
}

// --- Your existing endpoints, now sanitized ---
export async function getEvents() {
  if (!API_BASE) return []; // no API configured -> keep using mock in UI
  const res = await fetch(`${API_BASE}/api/events`, { credentials: "include" });
  if (!res.ok) throw new Error(`Events failed: ${res.status}`);
  return res.json();
}

export async function getEventById(id) {
  if (!API_BASE) throw new Error("No API base URL configured");
  const res = await fetch(`${API_BASE}/api/events/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Event failed: ${res.status}`);
  return res.json();
}

export async function postRsvp(eventId, userId, status = "going") {
  if (!API_BASE) throw new Error("No API base URL configured");
  const res = await fetch(`${API_BASE}/api/rsvps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ eventId, userId, status }),
  });
  if (!res.ok) throw new Error(`RSVP failed: ${res.status}`);
  return res.json();
}

export async function getUserRsvps(userId) {
  if (!API_BASE) return [];
  const res = await fetch(`${API_BASE}/api/rsvps/user/${userId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`User RSVPs failed: ${res.status}`);
  return res.json();
}

export async function signupUser(username, email, password) {
  console.log("API_BASE is", API_BASE);
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  // parse response and surface server error messages when present
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`Signup failed: status ${res.status}`);
    return {};
  }
  if (!res.ok) throw new Error(payload?.error || payload?.message || `Signup failed: ${res.status}`);
  return payload;
}


export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  // Parse JSON and include server-provided error if available
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`Login failed: status ${res.status}`);
    return {};
  }
  if (!res.ok) throw new Error(payload?.error || payload?.message || `Login failed: ${res.status}`);
  return payload;
}

