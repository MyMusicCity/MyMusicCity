const API_BASE = process.env.REACT_APP_API_URL;

export async function getEvents() {
  const res = await fetch(`${API_BASE}/api/events`);
  return res.json();
}

export async function getEventById(id) {
  const res = await fetch(`${API_BASE}/api/events/${id}`);
  return res.json();
}

export async function postRsvp(eventId, userId, status = "going") {
  const res = await fetch(`${API_BASE}/api/rsvps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, userId, status }),
  });
  return res.json();
}

export async function getUserRsvps(userId) {
  const res = await fetch(`${API_BASE}/api/rsvps/user/${userId}`);
  return res.json();
}