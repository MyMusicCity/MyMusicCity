import React, { useEffect, useState, useContext } from "react";
import { getUserRsvps, getMeRsvps, ping, deleteRsvp } from "../api";
import EventCard from "../components/EventCard";
import { AuthContext } from "../AuthContext";
import "../styles.css";

export default function RSVPs() {
  const { user } = useContext(AuthContext);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRsvps = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await getMeRsvps();
      setRsvps(data || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load RSVPs");
    } finally {
      setLoading(false);
    }
  };

  const handleUnRsvp = async (eventId, eventTitle) => {
    const shortTitle = eventTitle?.substring(0, 30) + (eventTitle?.length > 30 ? '...' : '');
    
    if (!window.confirm(`Are you sure you want to cancel your RSVP for "${shortTitle}"?`)) {
      return;
    }

    try {
      await deleteRsvp(eventId);
      alert(`✅ Successfully canceled your RSVP for "${shortTitle}"`);
      // Refresh the RSVPs list
      await loadRsvps();
    } catch (err) {
      alert(`❌ Failed to cancel RSVP: ${err.message || 'Please try again'}`);
    }
  };

  useEffect(() => {
    loadRsvps();
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
            <div key={r._id || r.event?._id || Math.random()} className="rsvp-card-wrapper" style={{ position: 'relative' }}>
              <EventCard event={r.event} />
              <button
                onClick={() => handleUnRsvp(r.event?._id || r.event?.id, r.event?.title)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'background-color 0.2s',
                  zIndex: 10
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#d32f2f'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f44336'}
                title="Cancel RSVP for this event"
              >
                🚫 Cancel
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p>You haven’t RSVP’d to any events yet.</p>
      )}
    </div>
  );
}
