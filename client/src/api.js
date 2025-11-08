export async function getEventRsvps(eventId) {
  if (!API_BASE) return [];
  const res = await fetch(`${API_BASE}/api/rsvps/event/${eventId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Event RSVPs failed: ${res.status}`);
  return res.json();
}

export async function getUserById(id) {
  if (!API_BASE) throw new Error("No API base URL configured");
  const res = await fetch(`${API_BASE}/api/users/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Get user failed: ${res.status}`);
  return res.json();
}

export async function signupUser(username, email, password, year, major) {
  console.log("API_BASE is", API_BASE);
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password, year, major }),
  });

  // parse response and surface server error messages when present
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`Signup failed: status ${res.status}`);
    return {};
  }

  if (!res.ok)
    throw new Error(
      payload?.error || payload?.message || `Signup failed: ${res.status}`
    );

  return payload;
}
