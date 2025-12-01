import React from "react";
import { Link } from "react-router-dom";
import { FaUserFriends } from "react-icons/fa";
import { FaRegCommentDots } from "react-icons/fa";

export default function EventCard({ event }) {
  if (!event) return null;

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (error) {
      return dateString; // Fallback to original if formatting fails
    }
  };

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

  // Calculate popularity and determine if event is "hot"
  const popularityScore = attendeeCount + commentCount;
  const isPopular = popularityScore >= 2; // Show badge for events with 2+ interactions

  return (
    <Link
      to={`/event/${event._id || event.id}`}
      state={{ event }}
      className="event-card"
    >
      {/* IMAGE */}
      <div style={{ position: 'relative' }}>
        <img
          src={
            event.image ||
            `https://picsum.photos/400/240?random=${event._id || event.id}`
          }
          alt={event.title}
          className="event-img"
        />
        {/* POPULAR BADGE */}
        {isPopular && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            fontSize: '11px',
            fontWeight: '600',
            padding: '4px 8px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            🔥 Hot
          </div>
        )}
      </div>

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
            {formatDate(event.date)}
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
