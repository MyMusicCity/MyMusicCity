// client/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import "../styles.css";
import { FiSearch } from "react-icons/fi";
import EventCard from "../components/EventCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { ping, getEvents } from "../api";

// --- Mock events for fallback ---
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
  const [sortBy, setSortBy] = useState("Most Popular");
  const [welcome, setWelcome] = useState(true);
  const [username, setUsername] = useState("");

  // --- Welcome banner + username ---
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsername(user.username || "friend");
    }

    const timer = setTimeout(() => setWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // --- Load events (API or mock fallback) ---
  useEffect(() => {
    ping().catch(() => {});
    let mounted = true;

    (async () => {
      try {
        const apiEvents = await getEvents();
        if (mounted && apiEvents && apiEvents.length) {
          setEvents(apiEvents);
          setLoading(false);
          return;
        }
      } catch (err) {
        // fallback to mock events
      }

      const timer = setTimeout(() => {
        if (!mounted) return;
        setEvents(MOCK_EVENTS);
        setLoading(false);
      }, 600);

      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="home">
      {/* ✅ Welcome message */}
      {welcome && (
        <div className="welcome-banner">
          Welcome back, <strong>{username}</strong>!
        </div>
      )}

      {/* LEFT SIDEBAR FILTERS */}
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

      {/* RESULTS COLUMN */}
      <section className="results">
        <div className="search-row">
          <div className="search">
            <FiSearch />
            <input type="text" placeholder="Search events" />
          </div>
          <div>
            <label>Sort By:&nbsp;</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Most Popular</option>
              <option>Soonest</option>
            </select>
          </div>
        </div>

        <p style={{ margin: "8px 0 16px" }}>{events.length} Results found</p>

        <div className="grid">
          {(() => {
            const list = [...events];
            if (sortBy === "Soonest") {
              list.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else {
              list.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
            return list.map((e) => (
              <EventCard key={e._id || e.id} event={e} />
            ));
          })()}
        </div>
      </section>
    </div>
  );
}
