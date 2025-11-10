import React, { useEffect, useState, useContext } from "react";
import { getUserRsvps, getMeRsvps } from "../api";
import EventCard from "../components/EventCard";
import { AuthContext } from "../AuthContext";
import "../styles.css";

export default function RSVPs() {
  const { user } = useContext(AuthContext);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Prefer the authenticated endpoint so the client does not need to supply the user id
    getMeRsvps()
      .then((data) => setRsvps(data || []))
      .catch((err) => setError(err.message || "Failed to load RSVPs"))
      .finally(() => setLoading(false));
  }, [user]);

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
      ) : rsvps.length > 0 ? (
        <div className="grid">
          {rsvps.map((r) => (
            <div key={r._id || r.event?._id || Math.random()} className="rsvp-card-wrapper">
              <EventCard event={r.event} />
            </div>
          ))}
        </div>
      ) : (
        <p>You haven’t RSVP’d to any events yet.</p>
      )}
    </div>
  );
}
