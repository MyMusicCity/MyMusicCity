import React from "react";
import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  // Use event._id when available (server objects) or fallback to event.id for mocks
  const id = event._id || event.id;

  // Use multiple fallbacks for image reliability
  const getImageSrc = () => {
    if (event.image) return event.image;
    // Use a more reliable stock photo service with consistent sizing
    return `https://picsum.photos/400/240?random=${id || Math.floor(Math.random() * 100)}`;
  };

  return (
    <Link to={`/event/${id}`} state={{ event }} className="event-card">
      <img 
        src={getImageSrc()} 
        alt={event.title}
        onError={(e) => {
          // Final fallback if all else fails
          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODUuNSAxMjBMMjAwIDEwNS41TDIxNC41IDEyMEwyMDAgMTM0LjVMMTg1LjUgMTIwWiIgZmlsbD0iIzk0QTNCOCIvPgo8L3N2Zz4K';
        }}
      />
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
