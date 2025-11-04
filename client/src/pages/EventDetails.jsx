import React, { useEffect, useState, useContext } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles.css";
import { getEventById, postRsvp } from "../api";
import { AuthContext } from "../AuthContext";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation(); // Grab event data passed from Home

  const [event, setEvent] = useState(state?.event || null);
  const [loading, setLoading] = useState(!state?.event);
  const [error, setError] = useState("");
  const { user } = useContext(AuthContext);

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
        <p className="event-description">
          {`Join us for ${event.title}, featuring incredible music and a vibrant Nashville crowd!`}
        </p>
        <button
          className="rsvp-btn"
          onClick={async () => {
            if (!user || !user.id) {
              alert("Please log in to RSVP.");
              navigate("/login");
              return;
            }
            try {
              const payload = await postRsvp(event._id || event.id, user.id);
              // server returns populated RSVP; show simple confirmation
              alert("RSVP successful!");
              console.log("RSVP created:", payload);
            } catch (err) {
              console.error("RSVP error:", err);
              alert(err.message || "Failed to RSVP");
            }
          }}
        >
          RSVP
        </button>
      </div>
    </div>
  );
}
