import React, { useEffect, useState } from "react";
import { getUserRsvps } from "../api";
import EventCard from "../components/EventCard";

export default function RSVPs() {
  const userId = "66dabc1234"; // temporary demo user
  const [rsvps, setRsvps] = useState([]);

  useEffect(() => {
    getUserRsvps(userId).then((data) => setRsvps(data));
  }, []);

  return (
    <div className="rsvp-page">
      <h2>My RSVPs</h2>
      <div className="event-grid">
        {rsvps.length > 0 ? (
          rsvps.map((r) => <EventCard key={r._id} event={r.event} />)
        ) : (
          <p>You haven’t RSVP’d to any events yet.</p>
        )}
      </div>
    </div>
  );
}
