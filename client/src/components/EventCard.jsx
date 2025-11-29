import React from "react";
import { Link } from "react-router-dom";
import { FaUserFriends } from "react-icons/fa";
import { FaRegCommentDots } from "react-icons/fa";

export default function EventCard({ event }) {
  if (!event) return null;

  // Server now returns rsvpCount; fall back to older shapes for backward compat.
  const attendeeCount =
    event.rsvpCount ||
    event._attendeeCount ||
    (Array.isArray(event.rsvps) ? event.rsvps.length : 0);

  // Server returns commentCount; keep backward compatibility with older shapes
  const commentCount =
    event.commentCount ||
    event._commentCount ||
    (Array.isArray(event.comments)
      ? event.comments.reduce(
          (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
          0
        )
      : 0);

  return (
    <Link
      to={`/event/${event._id || event.id}`}
      state={{ event }}
      className="event-card"
    >
      {/* IMAGE */}
      <img
        src={
          event.image ||
          `https://picsum.photos/400/240?random=${event._id || event.id}`
        }
        alt={event.title}
        className="event-img"
      />

      <div className="event-info">
        <h4>{event.title}</h4>
        <p className="location">{event.location}</p>

        {/* ============================
             DATE + ICONS ROW
        ============================ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          {/* DATE (left) */}
          <p className="date" style={{ margin: 0 }}>
            {event.date}
          </p>

          {/* ICONS (right) */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              opacity: 0.9,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <FaUserFriends size={14} /> {attendeeCount}
            </span>

            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <FaRegCommentDots size={14} /> {commentCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
