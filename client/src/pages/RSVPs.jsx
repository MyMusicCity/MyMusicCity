import React, { useEffect, useState, useContext } from "react";
import { getUserRsvps, getMeRsvps, ping } from "../api";
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

  // Diagnostics state
  const [diag, setDiag] = useState(null);
  const runDiag = async () => {
    setDiag({ running: true });
    try {
      const res = await ping();
      setDiag({ running: false, ok: !!res?.ok, details: res });
    } catch (e) {
      setDiag({ running: false, ok: false, error: e.message || String(e) });
    }
  };

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
        <div>
          <p className="error">{error}</p>
          <div style={{ marginTop: "0.5rem" }}>
            <button onClick={runDiag} className="small-btn">Run diagnostics</button>
            {diag?.running && <span style={{ marginLeft: 8 }}>Checking...</span>}
            {diag && !diag.running && (
              <div style={{ marginTop: "0.5rem" }}>
                {diag.ok ? (
                  <span style={{ color: "green" }}>Server reachable</span>
                ) : (
                  <span style={{ color: "red" }}>Server unreachable: {diag.error || JSON.stringify(diag.details)}</span>
                )}
              </div>
            )}
          </div>
        </div>
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
