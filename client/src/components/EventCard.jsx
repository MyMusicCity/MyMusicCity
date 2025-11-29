import React from "react";
import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  // Use event._id when available (server objects) or fallback to event.id for mocks
  const id = event._id || event.id;

  // Use multiple fallbacks for image reliability
  const getImageSrc = () => {
    if (event.image) return event.image;
    return `https://picsum.photos/400/240?random=${id || Math.floor(Math.random() * 100)}`;
  };

  return (
    <Link to={`/event/${id}`} state={{ event }} className="event-card">
      <img
        src={getImageSrc()}
        alt={event.title}
        onError={(e) => {
          e.target.src =
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyNDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMjAwIDEzNC41TDE4NS41IDEyMEwyMDAgMTA1LjVMMjE0LjUgMTIwTDIwMCAxMzQuNVoiIGZpbGw9IiM5NEEzQjgiLz48L3N2Zz4=";
        }}
      />

      <div className="event-info">
        <h3>{event.title}</h3>
        <p>{event.location}</p>

        <p className="date">
          {event.date ? new Date(event.date).toLocaleDateString() : ""}
        </p>

        {/* ⭐ META INFO: RSVP and Comment Counts */}
        <div
          className="event-meta"
          style={{
            marginTop: "0.5rem",
            fontSize: "0.9rem",
            color: "#555",
            display: "flex",
            gap: "1rem",
          }}
        >
          <span>👥 {event.rsvpCount ?? 0}</span>
          <span>💬 {event.commentCount ?? 0}</span>
        </div>
      </div>
    </Link>
  );
}
