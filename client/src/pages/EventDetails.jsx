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

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [event, setEvent] = useState(state?.event || null);
  const [loading, setLoading] = useState(!state?.event);
  const [error, setError] = useState("");
  const { user } = useContext(AuthContext);
  const [attendees, setAttendees] = useState([]);

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
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <img src={event.image} alt={event.title} className="event-details-img" />

      <div className="event-details-content">
        <h1>{event.title}</h1>
        <p className="event-date">{event.date}</p>
        <p className="event-location">📍 {event.location}</p>

        {/* ========================
              ATTENDEES & RSVP
        ======================== */}
        <div style={{ marginTop: "1rem" }}>
          {(() => {
            // Decide whether current user is attending
            const currentUserId = user?.id || user?._id;
            const isAttending = attendees.some((r) => {
              const uid = r.user?._id || r.user?.id;
              return uid && currentUserId && String(uid) === String(currentUserId);
            });

            const evId = event._id || event.id || id;

            if (isAttending) {
              return (
                <button
                  className="rsvp-btn"
                  onClick={async () => {
                    if (!user) {
                      alert("Please log in to cancel RSVP.");
                      navigate("/login");
                      return;
                    }

                    try {
                      await deleteRsvp(evId);
                      // Refresh attendees and counts
                      const list = await getEventRsvps(evId);
                      setAttendees(list || []);
                      setEvent((prev) => ({ ...prev, rsvpCount: list?.length || 0 }));
                      alert("RSVP cancelled");
                    } catch (err) {
                      console.error("Cancel RSVP failed", err);
                      alert(err.message || "Failed to cancel RSVP");
                    }
                  }}
                >
                  Cancel RSVP
                </button>
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
                    await postRsvp(evId);
                    alert("RSVP successful!");
                    const list = await getEventRsvps(evId);
                    setAttendees(list || []);
                    setEvent((prev) => ({ ...prev, rsvpCount: list?.length || 0 }));
                  } catch (err) {
                    console.error("RSVP error:", err);
                    alert(err.message || "Failed to RSVP");
                  }
                }}
              >
                RSVP
              </button>
            );
          })()}
        </div>
        <div className="attendees">
          <h3>Attendees</h3>

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
                      {u.username ? u.username[0].toUpperCase() : "?"}
                    </div>
                    <div className="attendee-name">{u.username || "Unknown"}</div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p>No attendees yet.</p>
          )}
        </div>

        {/* ========================
              COMMENTS SECTION
        ======================== */}
        <div className="comments-section" style={{ marginTop: "2rem" }}>
          <h3>Comments ({totalComments})</h3>

          {/* Comment Input */}
          <div className="comment-input" style={{ marginTop: "1rem" }}>
            <textarea
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
            <button
              className="rsvp-btn"
              onClick={handleCommentSubmit}
              style={{ marginTop: "0.5rem" }}
            >
              Post Comment
            </button>
          </div>

          {/* Comment List */}
          <div className="comments-list" style={{ marginTop: "1.5rem" }}>
            {comments.length === 0 && <p>No comments yet.</p>}

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
  );
}
