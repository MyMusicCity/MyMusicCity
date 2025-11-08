import React, { useEffect, useState, useContext } from "react";
import { getUserRsvps } from "../api";
import EventCard from "../components/EventCard";
import { AuthContext } from "../AuthContext";

export default function RSVPs() {
  const { user } = useContext(AuthContext);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Auth routes return user.id (not _id). Accept either form.
    const userId = user ? (user.id || user._id) : null;
    if (!userId) return;
    setLoading(true);
    getUserRsvps(userId)
      .then((data) => setRsvps(data || []))
      .catch((err) => setError(err.message || "Failed to load RSVPs"))
      .finally(() => setLoading(false));
  }, [user && (user.id || user._id)]);

  if (!user) {
    return (
      <div className="rsvp-page">
        <h2>My RSVPs</h2>
        <p>Please log in to view your RSVPs.</p>
      </div>
    );
  }

  return (
    <div className="rsvp-page">
      <h2>My RSVPs</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <div className="event-grid">
          {rsvps.length > 0 ? (
            rsvps.map((r) => <EventCard key={r._id} event={r.event} />)
          ) : (
            <p>You haven’t RSVP’d to any events yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
