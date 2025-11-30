// client/src/api.js
// If REACT_APP_API_URL was not provided at build time, fall back at runtime to
// the current origin. This keeps the UI identical while allowing same-origin
// deployments without a build-time env var.
const API_BASE = (
  process.env.REACT_APP_API_URL || (typeof window !== "undefined" && window.location && window.location.origin) || ""
).replace(/\/$/, "");

// Helper to get Auth0 token from the current context
let getAccessTokenSilently = null;

export function setAuth0TokenProvider(tokenProvider) {
  getAccessTokenSilently = tokenProvider;
}

// Small helper to avoid fetch hanging indefinitely in environments that return
// an HTML auth page or otherwise stall. Returns a Response or throws on abort.
async function fetchWithTimeout(url, opts = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === "AbortError") throw new Error("Request timed out");
    // Enhance network errors so the UI can display actionable hints
    const msg = err && err.message ? String(err.message) : "Network error";
    if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror") || msg.toLowerCase().includes("network error")) {
      throw new Error("Network error or request blocked (CORS / SSO / proxy). " + msg);
    }
    throw err;
  }
}

// Helper to get authorization headers with Auth0 token
async function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  
  // Try Auth0 token first
  if (getAccessTokenSilently) {
    try {
      const token = await getAccessTokenSilently();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get Auth0 token:', error);
    }
  }
  
  // Fallback to localStorage token for backward compatibility
  if (!headers.Authorization) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return headers;
}

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

export async function postRsvp(eventId, status = "going") {
  if (!API_BASE) throw new Error("No API base URL configured");
  const headers = await getAuthHeaders();

  const res = await fetchWithTimeout(`${API_BASE}/api/rsvps`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ eventId, status }),
  });
  // Parse JSON and surface server-provided error messages when present
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`RSVP failed: status ${res.status}`);
    return {};
  }
  if (!res.ok) throw new Error(payload?.error || payload?.message || `RSVP failed: ${res.status}`);
  return payload;
}

export async function getUserRsvps(userId) {
  // Backward-compatible: if called with a userId, still fetch that user's RSVPs
  if (!API_BASE) return [];
  if (userId) {
    const res = await fetchWithTimeout(`${API_BASE}/api/rsvps/user/${userId}`, { credentials: "include" });
    if (!res.ok) throw new Error(`User RSVPs failed: ${res.status}`);
    return res.json();
  }
  // If no userId provided, prefer the authenticated /api/me/rsvps endpoint using Auth0 token
  const headers = await getAuthHeaders();
  const res = await fetchWithTimeout(`${API_BASE}/api/me/rsvps`, { credentials: "include", headers });
  if (!res.ok) throw new Error(`User RSVPs (me) failed: ${res.status}`);
  return res.json();
}

export async function getMeRsvps() {
  return getUserRsvps();
}

export async function getEventRsvps(eventId) {
  if (!API_BASE) return [];
  const res = await fetchWithTimeout(`${API_BASE}/api/rsvps/event/${eventId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Event RSVPs failed: ${res.status}`);
  return res.json();
}

export async function deleteRsvp(eventId) {
  if (!API_BASE) throw new Error("No API base URL configured");
  const headers = await getAuthHeaders();

  const res = await fetchWithTimeout(`${API_BASE}/api/rsvps/event/${eventId}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch (e) {
    // ignore parse errors for empty responses
  }
  if (!res.ok) throw new Error(payload?.error || `Delete RSVP failed: ${res.status}`);
  return payload;
}

export async function getUserById(id) {
  if (!API_BASE) throw new Error("No API base URL configured");
  const res = await fetchWithTimeout(`${API_BASE}/api/users/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Get user failed: ${res.status}`);
  return res.json();
}

export async function signupUser(username, email, password, year, major) {
  console.log("API_BASE is", API_BASE);
  const res = await fetchWithTimeout(`${API_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, email, password, year, major }),
  });

  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`Signup failed: status ${res.status}`);
    return {};
  }
  if (!res.ok)
    throw new Error(payload?.error || payload?.message || `Signup failed: ${res.status}`);
  return payload;
}

export async function loginUser(email, password) {
  // Use a timeout and include credentials. If the server returns an HTML page
  // (e.g. a login proxy or SSO page), parse will fail and we surface a helpful
  // error instead of leaving the UI stuck.
  const res = await fetchWithTimeout(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  // Try to parse JSON; if response is HTML or unparsable, throw with hint.
  const contentType = res.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    try {
      payload = await res.json();
    } catch (e) {
      // fall through to error below
    }
  } else if (contentType.includes("text/html")) {
    throw new Error("Authentication blocked by an HTML login page (possible SSO or proxy). Please check deployment auth settings.");
  }

  if (!res.ok) {
    // If we got JSON, use server message; otherwise show status
    throw new Error((payload && (payload.error || payload.message)) || `Login failed: ${res.status}`);
  }
  return payload || {};
}

// --- COMMENTS API ---

export async function getComments(eventId) {
  const res = await fetch(`${API_BASE}/api/comments/${eventId}`);
  if (!res.ok) throw new Error("Failed to load comments");
  return res.json();
}

export async function postComment(eventId, text) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/comments`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ eventId, text }),
  });
  if (!res.ok) throw new Error("Failed to post comment");
  return res.json();
}

export async function deleteComment(commentId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
    method: "DELETE",
    headers,
    credentials: "include"
  });
  if (!res.ok) throw new Error("Failed to delete comment");
  return res.json();
}

export async function postReply(commentId, eventId, text) {
  // Keep URL consistent with other API endpoints (mounted under /api)
  // and include the Authorization header so auth middleware can validate the user.
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE}/api/comments/${commentId}/reply`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ eventId, text }),
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`Reply failed: status ${res.status}`);
  }

  if (!res.ok) throw new Error(payload?.error || payload?.message || "Failed to reply");

  return payload;
}



