import React, { useEffect, useState } from "react";
import "../styles.css";
import { FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API loading
    const timer = setTimeout(() => {
      setEvents([
        {
          id: 1,
          title: "Celebrate Nashville",
          location: "Centennial Park",
          date: "OCT 4, 2025",
          image:
            "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=900&q=60",
          attendees: ["J", "E", "A", "K", "S", "L"],
        },
        {
          id: 2,
          title: "Charles Kelley Live",
          location: "Lower Broadway",
          date: "OCT 6, 2025",
          image:
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=60",
          attendees: ["E", "M"],
        },
        {
          id: 3,
          title: "Indie Night at The Basement",
          location: "The Basement East",
          date: "OCT 9, 2025",
          image:
            "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=900&q=60",
          attendees: ["J", "E", "A", "M", "S"],
        },
        {
          id: 4,
          title: "Jazz Evening at Rudy’s",
          location: "Rudy’s Jazz Room",
          date: "OCT 12, 2025",
          image:
            "https://images.unsplash.com/photo-1485579149621-3123dd979885?auto=format&fit=crop&w=900&q=60",
          attendees: ["E", "R", "B"],
        },
      ]);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div className="home-split">
      {/* LEFT FILTERS */}
      <aside className="filters">
        <h3>DATE</h3>
        <label>Start Date</label>
        <input type="date" />
        <label>End Date</label>
        <input type="date" />

        <h3>GENRES</h3>
        <label><input type="checkbox" /> Pop</label>
        <label><input type="checkbox" /> Rap</label>
        <label><input type="checkbox" /> Country</label>
        <label><input type="checkbox" /> Jazz</label>
      </aside>

      {/* RIGHT CONTENT */}
      <section className="events-area">
        <div className="top-bar">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Nashville local"
              className="search-input"
            />
          </div>

          <div className="sort-wrapper">
            <label htmlFor="sort" className="sort-label">Sort By:</label>
            <select id="sort" className="sort-select">
              <option>Most Popular</option>
              <option>Date (Newest)</option>
              <option>Date (Oldest)</option>
              <option>Location</option>
            </select>
          </div>
        </div>

        <p className="results-count">
          {events.length.toLocaleString()} Results found for “Nashville local”
        </p>

        <div className="event-grid">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/event/${event.id}`}
              state={{ event }} 
              className="event-card"
            >
              <img src={event.image} alt={event.title} />
              <div className="event-info">
                <div>
                  <h3>{event.title.toUpperCase()}</h3>
                  <p className="location">📍 {event.location}</p>
                </div>
                <p className="date">{event.date}</p>
              </div>
              <div className="attendees">
                {event.attendees.slice(0, 3).map((a) => (
                  <div key={a} className="avatar">
                    {a}
                  </div>
                ))}
                {event.attendees.length > 3 && (
                  <span className="more">
                    +{event.attendees.length - 3} others
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
