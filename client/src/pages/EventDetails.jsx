import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles.css";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation(); // Grab event data passed from Home

  const event = state?.event;

  if (!event) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Event not found</h2>
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
        <button className="rsvp-btn">RSVP</button>
      </div>
    </div>
  );
}
