import React, { useEffect, useState } from "react";
import { getEvents } from "../api";
import EventCard from "../components/EventCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="home">
      <div className="searchbar">
        <input type="text" placeholder="Search Nashville events..." />
      </div>

      <div className="event-grid">
        {events.length > 0 ? (
          events.map((e) => <EventCard key={e._id} event={e} />)
        ) : (
          <p>No events found</p>
        )}
      </div>
    </div>
  );
}
