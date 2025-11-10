import React, { useEffect, useState, useContext } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import "../styles.css";
import { getEventById, postRsvp, getEventRsvps } from "../api";
import { AuthContext } from "../AuthContext";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation(); // Grab event data passed from Home

  const [event, setEvent] = useState(state?.event || null);
  const [loading, setLoading] = useState(!state?.event);
  const [error, setError] = useState("");
  const { user } = useContext(AuthContext);
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    let mounted = true;
    if (!event) {
      // try fetching from API by id
      (async () => {
        try {
          const ev = await getEventById(id);
          if (mounted) {
            setEvent(ev);
            setLoading(false);
          }
        } catch (err) {
          if (mounted) {
            setError(err.message || "Event not found");
            setLoading(false);
          }
        }
      })();
    }
    return () => (mounted = false);
  }, [id]);

  // Fetch attendees for this event
  useEffect(() => {
    let mounted = true;
    const evId = event?._id || event?.id || id;
    if (!evId) return;
    (async () => {
      try {
        const list = await getEventRsvps(evId);
        if (mounted) setAttendees(list || []);
      } catch (err) {
        console.error("Failed to load attendees", err);
      }
    })();
    return () => (mounted = false);
  }, [event && (event._id || event.id), id]);

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  if (!event) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>{error || "Event not found"}</h2>
        <button className="back-btn" onClick={() => navigate("/")}> 
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="event-details">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <img src={event.image} alt={event.title} className="event-details-img" />

      <div className="event-details-content">
        <h1>{event.title}</h1>
        <p className="event-date">{event.date}</p>
        <p className="event-location">📍 {event.location}</p>
        <div className="attendees">
          <h3>Attendees</h3>
          {attendees.length > 0 ? (
            <div className="attendee-list">
              {attendees.map((r) => {
                const u = r.user || {};
                const uid = u._id || u.id;
                return (
                  <Link key={uid || Math.random()} to={`/profile/${uid}`} className="attendee-link">
                    <div className="attendee-avatar">{u.username ? u.username[0].toUpperCase() : "?"}</div>
                    <div className="attendee-name">{u.username || "Unknown"}</div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p>No attendees yet.</p>
          )}
        </div>
        <p className="event-description">
          {`Join us for ${event.title}, featuring incredible music and a vibrant Nashville crowd!`}
        </p>
        <button
          className="rsvp-btn"
          onClick={async () => {
            // Ensure user is logged in (server derives user from Authorization JWT)
            const userIdRaw = user?.id || user?._id;
            if (!user || !userIdRaw) {
              alert("Please log in to RSVP.");
              navigate("/login");
              return;
            }

            // Normalize event id and user id to strings that look like ObjectId
            const getIdStr = (v) => {
              if (!v) return null;
              if (typeof v === "string") return v;
              if (v && typeof v === "object") {
                // Mongoose sometimes returns {_id: { $oid: '...' }} in some serializers
                if (v.$oid) return v.$oid;
                if (v.toString) return v.toString();
              }
              return String(v);
            };

            const eventIdStr = getIdStr(event._id || event.id);
            const userIdStr = getIdStr(userIdRaw);

            // Basic ObjectId sanity: 24 hex characters
            const isLikelyObjectId = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

            if (!isLikelyObjectId(eventIdStr)) {
              alert("This event cannot be RSVPed to (not a server-backed event).");
              return;
            }
            try {
              console.log("Posting RSVP", { eventId: eventIdStr });
              const payload = await postRsvp(eventIdStr);
              // server returns populated RSVP; show simple confirmation
              alert("RSVP successful!");
              console.log("RSVP created:", payload);
            } catch (err) {
              console.error("RSVP error:", err);
              // api throws Error with server message when available
              alert(err.message || JSON.stringify(err) || "Failed to RSVP");
            }
          }}
        >
          RSVP
        </button>
      </div>
    </div>
  );
}
