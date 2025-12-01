import React, { useEffect, useState, useContext } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import "../styles.css";
import {
  getEventById,
  postRsvp,
  getEventRsvps,
  deleteRsvp,
  getComments,
  postComment,
  deleteComment,
  postReply,
} from "../api";
import { AuthContext } from "../AuthContext";

// Helper function for Vanderbilt-themed avatar generation (First letter only)
const getAvatarText = (username, email, fullName) => {
  // Try to get first letter from full name first
  if (fullName && fullName.trim()) {
    return fullName.trim()[0].toUpperCase();
  }
  
  // Try to get first letter from username
  if (username && username.trim()) {
    return username.trim()[0].toUpperCase();
  }
  
  // Fallback to email
  if (email && email.trim()) {
    return email[0].toUpperCase();
  }
  
  return "?";
};

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [event, setEvent] = useState(state?.event || null);
  const [loading, setLoading] = useState(!state?.event);
  const [error, setError] = useState("");
  const { user } = useContext(AuthContext);
  const [attendees, setAttendees] = useState([]);

  // Format date for display (same as EventCard)
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

  /* ===========================
        COMMENT STATE
  =========================== */
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  /* ===========================
        LOAD COMMENTS
  =========================== */
  useEffect(() => {
    if (!event) return;
    const evId = event._id || event.id;
    if (!evId) return;

    (async () => {
      try {
        const list = await getComments(evId);
        setComments(list || []);
      } catch (err) {
        console.error("Failed to load comments", err);
      }
    })();
  }, [event]);

  /* ===========================
        COMMENT SUBMIT
  =========================== */
  const handleCommentSubmit = async () => {
    if (!user) {
      alert("Please log in to comment.");
      navigate("/login");
      return;
    }
    if (!commentText.trim()) return;

    try {
      const evId = event._id || event.id;
      await postComment(evId, commentText);

      // Reload full tree
      const updated = await getComments(evId);
      setComments(updated);

      // keep the event object in sync with the new comment total
      setEvent((prev) => ({ ...prev, commentCount: countAllComments(updated) }));

      setCommentText("");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to post comment");
    }
  };

  /* ===========================
        DELETE COMMENT
  =========================== */
  const handleDeleteComment = async (commentId) => {
    if (!user) return;
    try {
      await deleteComment(commentId);

      const evId = event._id || event.id;
      const updated = await getComments(evId);
      setComments(updated);
      setEvent((prev) => ({ ...prev, commentCount: countAllComments(updated) }));
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment");
    }
  };

  /* ===========================
          LOAD EVENT DATA
  =========================== */
  useEffect(() => {
    let mounted = true;
    if (!event) {
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

  /* ===========================
          LOAD ATTENDEES
  =========================== */
  useEffect(() => {
    let mounted = true;
    const evId = event?._id || event?.id || id;
    if (!evId) return;

    const loadAttendees = async () => {
      try {
        const list = await getEventRsvps(evId);
        if (mounted) {
          console.log('🔍 DEBUG - Loaded attendees:', {
            eventId: evId,
            attendees: list?.map(r => ({
              userId: r.user?._id || r.user?.id,
              userAuth0Id: r.user?.auth0Id,
              userEmail: r.user?.email,
              username: r.user?.username
            })),
            currentUser: user ? {
              id: user?.id || user?._id,
              auth0Id: user?.auth0Id || user?.sub,
              email: user?.email
            } : null
          });
          setAttendees(list || []);
        }
      } catch (err) {
        console.error("Failed to load attendees", err);
      }
    };

    loadAttendees();
    return () => (mounted = false);
  }, [event && (event._id || event.id), id, user]); // Add user dependency

  // Force refresh attendees when user changes or page loads
  const refreshAttendees = async () => {
    const evId = event?._id || event?.id || id;
    if (!evId) return;
    
    try {
      const list = await getEventRsvps(evId);
      setAttendees(list || []);
      console.log('🔄 Refreshed attendees:', list?.length || 0, 'attendees found');
    } catch (err) {
      console.error("Failed to refresh attendees", err);
    }
  };

  // Force refresh when user becomes available
  useEffect(() => {
    if (user && (event?._id || event?.id || id)) {
      console.log('👤 User loaded, force refreshing attendees...');
      refreshAttendees();
    }
  }, [user?.id, user?.sub, event?._id, event?.id]);

  /* ===========================
        RECURSIVE COMMENT COUNT
  =========================== */
  function countAllComments(list) {
    let total = 0;
    for (const c of list) {
      total++;
      if (c.replies?.length) {
        total += countAllComments(c.replies);
      }
    }
    return total;
  }

  const totalComments = countAllComments(comments);

  /* ===========================
        COMMENT COMPONENT
  =========================== */
  function CommentItem({ comment, user, onReply, onDelete }) {
    const [showReply, setShowReply] = useState(false);
    const [replyText, setReplyText] = useState("");

    return (
      <div style={{ marginLeft: comment.parent ? "1.5rem" : 0 }}>
        <div
          style={{
            padding: "0.75rem",
            border: "1px solid #eee",
            borderRadius: "8px",
            background: "#fafafa",
            marginBottom: "0.5rem",
          }}
        >
          <strong>{comment.user?.username || "Unknown"}</strong>
          <p>{comment.text}</p>
          <small>{new Date(comment.createdAt).toLocaleString()}</small>

          {/* Reply */}
          {user && (
            <button
              onClick={() => setShowReply(!showReply)}
              style={{
                marginLeft: "1rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
                color: "#0070f3",
              }}
            >
              Reply
            </button>
          )}

          {/* Delete */}
          {user?.id === comment.user?._id && (
            <button
              onClick={() => onDelete(comment._id)}
              style={{
                marginLeft: "1rem",
                color: "red",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          )}

          {/* Reply Input */}
          {showReply && (
            <div style={{ marginTop: "0.5rem" }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
                placeholder="Write a reply..."
              />
              <button
                className="rsvp-btn"
                onClick={() => {
                  onReply(comment._id, replyText);
                  setReplyText("");
                  setShowReply(false);
                }}
                style={{ marginTop: "0.5rem" }}
              >
                Post Reply
              </button>
            </div>
          )}
        </div>

        {/* Render nested replies */}
        {comment.replies?.map((child) => (
          <CommentItem
            key={child._id}
            comment={child}
            user={user}
            onReply={onReply}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  /* ===========================
        RENDER
  =========================== */

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
      <div className="event-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      <img src={event.image} alt="" className="event-details-img" />

      <div className="event-card-detail">
        {event.image && (
          <div className="event-image-container">
            <img src={event.image} alt="" className="event-details-img" />
          </div>
        )}
        
        <div className="event-details-content">
          <div className="event-main-info">
            <h1 className="event-title">{event.title}</h1>
            <div className="event-meta">
              <p className="event-date">📅 {formatDate(event.date)}</p>
              <p className="event-location">📍 {event.location}</p>
            </div>
          </div>

          {/* RSVP Section */}
          <div className="rsvp-section">
          <button 
            className="refresh-btn"
            onClick={refreshAttendees}
          >
            🔄 Refresh Status
          </button>
          
          {(() => {
            // Enhanced user matching for RSVP detection
            const currentUserId = user?.id || user?._id;
            const currentAuth0Id = user?.auth0Id || user?.sub;
            const currentEmail = user?.email;
            
            console.log('🔍 DEBUG - Enhanced RSVP Check:', {
              currentUserId,
              currentAuth0Id,
              currentEmail,
              userObject: user,
              attendeesCount: attendees.length,
              attendeeUserIds: attendees.map(r => ({
                id: r.user?._id || r.user?.id,
                auth0Id: r.user?.auth0Id,
                email: r.user?.email,
                username: r.user?.username
              }))
            });
            
            const isAttending = attendees.some((r) => {
              const uid = r.user?._id || r.user?.id;
              const auth0Id = r.user?.auth0Id;
              const email = r.user?.email;
              
              // Try multiple matching strategies
              const idMatch = uid && currentUserId && String(uid) === String(currentUserId);
              const auth0Match = auth0Id && currentAuth0Id && String(auth0Id) === String(currentAuth0Id);
              const crossMatch = (uid && currentAuth0Id && String(uid) === String(currentAuth0Id)) ||
                                (auth0Id && currentUserId && String(auth0Id) === String(currentUserId));
              const emailMatch = email && currentEmail && String(email).toLowerCase() === String(currentEmail).toLowerCase();
              
              const match = idMatch || auth0Match || crossMatch || emailMatch;
              console.log('🔍 Checking attendee:', {
                attendeeUserId: uid,
                attendeeAuth0Id: auth0Id,
                attendeeEmail: email,
                attendeeUsername: r.user?.username,
                currentUserId,
                currentAuth0Id,
                currentEmail,
                matches: { idMatch, auth0Match, crossMatch, emailMatch },
                finalMatch: match
              });
              return match;
            });

            console.log('🔍 Final isAttending result:', isAttending);

            const evId = event._id || event.id || id;

            if (isAttending) {
              return (
                <div className="rsvp-status">
                  <div className="attending-badge">
                    ✅ You're attending this event
                  </div>
                  <button
                    className="cancel-rsvp-btn"
                    onClick={async () => {
                      if (!user) {
                        alert("Please log in to cancel RSVP.");
                        navigate("/login");
                        return;
                      }

                      // Add confirmation dialog
                      if (!window.confirm("Are you sure you want to cancel your RSVP for this event?")) {
                        return;
                      }

                      try {
                        console.log('🚫 Attempting to cancel RSVP for event:', evId);
                        await deleteRsvp(evId);
                        
                        // Refresh attendees and counts immediately
                        console.log('✅ RSVP canceled, refreshing data...');
                        await refreshAttendees();
                        
                        // Update event counts
                        const list = await getEventRsvps(evId);
                        setEvent((prev) => ({ ...prev, rsvpCount: list?.length || 0 }));
                        
                        // Better success message
                        const eventTitle = event.title?.substring(0, 30) + (event.title?.length > 30 ? '...' : '');
                        alert(`✅ Successfully canceled your RSVP for "${eventTitle}"`);
                      } catch (err) {
                        console.error("Cancel RSVP failed", err);
                        alert(`❌ Failed to cancel RSVP: ${err.message || 'Please try again'}`);
                      }
                    }}
                  >
                    🚫 Cancel RSVP
                  </button>
                </div>
              );
            }

            return (
              <button
                className="rsvp-btn"
                onClick={async () => {
                  if (!user) {
                    alert("Please log in to RSVP.");
                    navigate("/login");
                    return;
                  }

                  try {
                    console.log('🎵 Attempting to RSVP for event:', evId);
                    await postRsvp(evId);
                    
                    // Refresh attendees immediately
                    console.log('✅ RSVP successful, refreshing data...');
                    await refreshAttendees();
                    
                    const eventTitle = event.title?.substring(0, 30) + (event.title?.length > 30 ? '...' : '');
                    alert(`🎉 Successfully RSVP'd to "${eventTitle}"! See you there!`);
                    
                    // Update event counts
                    const list = await getEventRsvps(evId);
                    setEvent((prev) => ({ ...prev, rsvpCount: list?.length || 0 }));
                  } catch (err) {
                    console.error("RSVP error:", err);
                    alert(`❌ Failed to RSVP: ${err.message || 'Please try again'}`);
                  }
                }}
              >
                🎵 RSVP to This Event
              </button>
            );
          </div>

          {/* Attendees Section */}
          <div className="attendees-section">
            <h3>Attendees ({attendees.length})</h3>
            {attendees.length > 0 ? (
              <div className="attendee-list">
                {attendees.map((r) => {
                  const u = r.user || {};
                  const uid = u._id || u.id;
                  return (
                    <Link
                      key={uid}
                      to={`/profile/${uid}`}
                      className="attendee-link"
                    >
                      <div className="attendee-avatar">
                        {getAvatarText(u.username, u.email, null)}
                      </div>
                      <div className="attendee-name">{u.username || "Unknown"}</div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="no-attendees">No attendees yet. Be the first to RSVP!</p>
            )}
          </div>

          {/* Comments Section */}
          <div className="comments-section">
            <h3>Comments ({totalComments})</h3>
            
            {/* Comment Input */}
            <div className="comment-input">
              <textarea
                className="comment-textarea"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
              <button
                className="comment-btn"
                onClick={handleCommentSubmit}
              >
                Post Comment
              </button>
            </div>

            {/* Comments List */}
            <div className="comments-list">
              {comments.length === 0 && (
                <p className="no-comments">No comments yet. Start the conversation!</p>
              )}
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  user={user}
                  onReply={async (parentId, text) => {
                    if (!text.trim()) return;
                    const evId = event._id || event.id;

                    await postReply(parentId, evId, text);

                    const updated = await getComments(evId);
                    setComments(updated);
                    setEvent((prev) => ({ ...prev, commentCount: countAllComments(updated) }));
                  }}
                  onDelete={handleDeleteComment}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
