import React from "react";
import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  return (
    <Link to={`/event/${event._id}`} className="event-card">
      <img src={event.image || "https://placehold.co/300x180"} alt={event.title} />
      <div className="event-info">
        <h3>{event.title}</h3>
        <p>{event.location}</p>
        <p className="date">{new Date(event.date).toLocaleDateString()}</p>
      </div>
    </Link>
  );
}
