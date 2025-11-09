import React, { useEffect, useState } from "react";
import "../styles.css";
import { FiSearch } from "react-icons/fi";
import EventCard from "../components/EventCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { ping, getEvents } from "../api";
import { Link } from "react-router-dom";

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
  const [showWelcome, setShowWelcome] = useState(false);
  const [username, setUsername] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ Only show banner if user just logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsername(user.username || "friend");

      if (localStorage.getItem("justLoggedIn") === "true") {
        setShowWelcome(true);
        setTimeout(() => {
          setShowWelcome(false);
          localStorage.removeItem("justLoggedIn");
        }, 3000);
      }
    }
  }, []);

  // ✅ Load events (API or fallback)
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
        // fallback
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

  // ✅ Search filter
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="home">
      {/* ✅ Show banner only right after login */}
      {showWelcome && (
        <div className="welcome-banner">
          Welcome back, <strong>{username}</strong> 👋
        </div>
      )}

      {/* LEFT FILTER PANEL */}
      <aside className="filters">
        <h3>DATE</h3>
        <input type="text" placeholder="Start Date" />
        <input type="text" placeholder="End Date" />
        <h3>GENRES</h3>
        <label><input type="checkbox" /> Pop</label>
        <label><input type="checkbox" /> Rap</label>
        <label><input type="checkbox" /> Country</label>
        <label><input type="checkbox" /> Jazz</label>
      </aside>

      {/* RESULTS SECTION */}
      <section className="results">
        <div className="search-row">
          <div className="search">
            <FiSearch />
            <input
              type="text"
              placeholder="Search events"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label>Sort By:&nbsp;</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Most Popular</option>
              <option>Soonest</option>
            </select>
          </div>
        </div>

        <p style={{ margin: "8px 0 16px" }}>
          {filteredEvents.length} Results found
        </p>

        {/* ✅ Event Grid */}
        <div className="grid">
          {filteredEvents.map((e) => (
            <Link
              key={e._id || e.id}
              to={`/event/${e._id || e.id}`}
              state={{ event: e }}
              className="event-card"
            >
              <img src={e.image} alt={e.title} className="event-img" />
              <div className="event-info">
                <h4>{e.title}</h4>
                <p className="location">{e.location}</p>
                <p className="date">{e.date}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
