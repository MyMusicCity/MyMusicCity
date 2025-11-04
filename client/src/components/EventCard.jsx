import React from "react";
import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  // Use event._id when available (server objects) or fallback to event.id for mocks
  const id = event._id || event.id;

  return (
    <Link to={`/event/${id}`} state={{ event }} className="event-card">
      <img src={event.image || "https://placehold.co/300x180"} alt={event.title} />
      <div className="event-info">
        <h3>{event.title}</h3>
        <p>{event.location}</p>
        <p className="date">
          {event.date ? new Date(event.date).toLocaleDateString() : ""}
        </p>
      </div>
    </Link>
  );
}
