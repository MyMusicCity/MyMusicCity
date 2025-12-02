// scripts/smoke.js
// Simple smoke test: ping, getEvents, optional login+RSVP
const axios = require('axios');

async function run() {
  const API = process.env.SMOKE_API_URL || process.argv[2] || process.env.REACT_APP_API_URL || 'http://localhost:5000';
  console.log('Using API base:', API);
  try {
    const ping = await axios.get(`${API.replace(/\/$/, '')}/healthz`, { timeout: 5000 });
    console.log('/healthz:', ping.status, ping.data);
  } catch (err) {
    console.error('Health check failed:', err.message || err);
    process.exit(2);
  }

  try {
    const ev = await axios.get(`${API.replace(/\/$/, '')}/api/events`, { timeout: 5000 });
    console.log('/api/events:', ev.status, `(${ev.data.length || 0} events)`);
    if (!ev.data || !ev.data.length) {
      console.warn('No events returned by API');
    }
  } catch (err) {
    console.error('GET /api/events failed:', err.response ? err.response.data : err.message);
    process.exit(3);
  }

  // Optional login + RSVP if credentials are provided
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (email && password) {
    try {
      const login = await axios.post(`${API.replace(/\/$/, '')}/api/login`, { email, password }, { timeout: 5000 });
      console.log('Login success:', login.status);
      const token = login.data.token;
      const user = login.data.user;
      if (!token || !user) throw new Error('No token/user returned');

      // fetch events again and RSVP to first event
      const eventsRes = await axios.get(`${API.replace(/\/$/, '')}/api/events`, { headers: { Authorization: `Bearer ${token}` } });
      const first = eventsRes.data && eventsRes.data[0];
      if (!first) {
        console.warn('No events available to RSVP to');
        process.exit(0);
      }
      const rsvpRes = await axios.post(`${API.replace(/\/$/, '')}/api/rsvps`, { eventId: first._id || first.id, userId: user.id || user._id }, { headers: { Authorization: `Bearer ${token}` } });
      console.log('RSVP created:', rsvpRes.status, rsvpRes.data);
    } catch (err) {
      console.error('Login/RSVP step failed:', err.response ? err.response.data : err.message);
      process.exit(4);
    }
  } else {
    console.log('No SMOKE_EMAIL/SMOKE_PASSWORD provided — skipping login/RSVP step');
  }

  console.log('Smoke test completed successfully');
}

run();
