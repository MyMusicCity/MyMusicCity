// client/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import "../styles.css";
import { FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import EventCard from "../components/EventCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { ping } from "../api"; // <-- silent API connectivity check (no UI impact)

// NOTE: Keep using your existing mock items so the UI stays identical.
// If you already import mock data from a file, you can replace MOCK_EVENTS below
// with your import and leave the rest unchanged.
const MOCK_EVENTS = [
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
    title: "Basement East — Local Showcase",
    location: "The Basement East",
    date: "OCT 6, 2025",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=60",
    attendees: ["M", "T", "R"],
  },
  {
    id: 3,
    title: "Jazz Night on 5th",
    location: "Printer’s Alley",
    date: "OCT 9, 2025",
    image:
      "https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=900&q=60",
    attendees: ["A", "V", "Q", "N"],
  },
];

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // --- Silent connectivity check to your deployed API (no UI change) ---
    // This will create a Fetch/XHR entry to <REACT_APP_API_URL>/healthz
    // so you can verify linkage in DevTools without altering the page.
    ping().catch(() => {
      // ignore errors — UI remains exactly the same
    });

    // --- Keep your existing behavior: render mock items after a short delay ---
    const timer = setTimeout(() => {
      setEvents(MOCK_EVENTS);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="home">
      {/* LEFT SIDEBAR FILTERS — unchanged */}
      <aside className="filters">
        <h3>DATE</h3>
        <input type="text" placeholder="mm/dd/yyyy" />
        <input type="text" placeholder="mm/dd/yyyy" />
        <h3>GENRES</h3>
        <label>
          <input type="checkbox" /> Pop
        </label>
        <label>
          <input type="checkbox" /> Rap
        </label>
        <label>
          <input type="checkbox" /> Country
        </label>
        <label>
          <input type="checkbox" /> Jazz
        </label>
      </aside>

      {/* RESULTS COLUMN — unchanged */}
      <section className="results">
        <div className="search-row">
          <div className="search">
            <FiSearch />
            <input type="text" placeholder="Search events" />
          </div>
          <div>
            <label>Sort By:&nbsp;</label>
            <select defaultValue="Most Popular">
              <option>Most Popular</option>
              <option>Soonest</option>
            </select>
          </div>
        </div>

        <p style={{ margin: "8px 0 16px" }}>{events.length} Results found</p>

        <div className="grid">
          {events.map((e) => (
            <Link
              key={e.id}
              to={`/event/${e.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <EventCard event={e} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
