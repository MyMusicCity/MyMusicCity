import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEventById, postRsvp } from "../api";

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState("none");
  const userId = "66dabc1234"; // temporary placeholder for demo

  useEffect(() => {
    getEventById(id).then((data) => setEvent(data));
  }, [id]);

  async function handleRsvp() {
    const newStatus = rsvpStatus === "going" ? "interested" : "going";
    await postRsvp(event._id, userId, newStatus);
    setRsvpStatus(newStatus);
  }

  if (!event) return <p>Loading...</p>;

  return (
    <div className="event-details">
      <img src={event.image || "https://placehold.co/800x300"} alt="Event" />
      <h2>{event.title}</h2>
      <p className="date-time">{new Date(event.date).toLocaleString()}</p>
      <p className="location">📍 {event.location}</p>

      <button className="rsvp-btn" onClick={handleRsvp}>
        ❤️ {rsvpStatus === "going" ? "Going" : "RSVP"}
      </button>

      <p>{event.description}</p>
    </div>
  );
}
