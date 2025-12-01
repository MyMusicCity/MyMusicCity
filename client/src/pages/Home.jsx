// client/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import "../styles.css";
import { FiSearch } from "react-icons/fi";
import LoadingSpinner from "../components/LoadingSpinner";
import { ping, getEvents, API_BASE } from "../api";
import EventCard from "../components/EventCard"; // ⭐ Use EventCard everywhere

// Temporary fallback data for local dev
const MOCK_EVENTS = [
  {
    id: 1,
    title: "Celebrate Nashville",
    location: "Centennial Park",
    date: "2025-12-05T19:00:00.000Z",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 2,
    title: "Basement East — Local Showcase",
    location: "The Basement East",
    date: "2025-12-08T20:00:00.000Z",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 3,
    title: "Jazz Night on 5th",
    location: "Printer's Alley",
    date: "2025-12-12T21:00:00.000Z",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 4,
    title: "Country Music Hall of Fame Concert",
    location: "Country Music Hall of Fame",
    date: "2025-12-15T19:30:00.000Z",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 5,
    title: "Indie Pop Showcase",
    location: "Marathon Music Works",
    date: "2025-12-18T20:30:00.000Z",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 6,
    title: "Hip-Hop Underground",
    location: "The End",
    date: "2025-12-22T22:00:00.000Z",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 7,
    title: "New Year's Eve Jazz Celebration",
    location: "Schermerhorn Symphony Center",
    date: "2025-12-31T23:00:00.000Z",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format",
  },
];

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("Most Popular");
  const [showWelcome, setShowWelcome] = useState(false);
  const [username, setUsername] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  // Genre filtering removed - handled server-side for music events only
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* ----------------------------------------
     SHOW "WELCOME BACK" BANNER AFTER LOGIN
  ------------------------------------------ */
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

  /* -------------------------
        LOAD CURRENT EVENTS
  ------------------------- */
  useEffect(() => {
    ping().catch(() => {});
    let mounted = true;

    (async () => {
      try {
        // Use the new /api/events/current endpoint for better filtering
        const response = await fetch(`${API_BASE}/api/events/current`);
        const apiEvents = await response.json();
        
        if (mounted && Array.isArray(apiEvents) && apiEvents.length > 0) {
          setEvents(apiEvents);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Primary API endpoint failed:', err.message);
        // Fallback to old endpoint if new one fails
        try {
          const apiEvents = await getEvents();
          if (mounted && Array.isArray(apiEvents) && apiEvents.length > 0) {
            // Filter to recent events on client side as fallback
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            
            const recentEvents = apiEvents.filter(event => {
              const eventDate = new Date(event.date);
              return eventDate >= twoWeeksAgo;
            });
            
            setEvents(recentEvents);
            setLoading(false);
            return;
          }
        } catch (err2) {
          console.log('Fallback API endpoint failed:', err2.message);
        }
      }

      // Final fallback to mock events if both endpoints fail
      if (mounted) {
        console.log('Using mock events as final fallback');
        setTimeout(() => {
          if (mounted) {
            setEvents(MOCK_EVENTS);
            setLoading(false);
          }
        }, 600);
      }
    })();

    return () => (mounted = false);
  }, []);

  if (loading) return <LoadingSpinner />;

  /* -------------------------
        FILTERING LOGIC
  ------------------------- */
  const filteredEvents = events
    .filter((e) => {
      const matchesSearch = e.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (startDate || endDate) {
        const eventDate = new Date(e.date);
        if (startDate && eventDate < new Date(startDate)) matchesDate = false;
        if (endDate && eventDate > new Date(endDate)) matchesDate = false;
      }

      return matchesSearch && matchesDate;
    })
    .sort((a, b) =>
      sortBy === "Soonest"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date)
    );

  // Debug logging
  console.log("🔍 Event filtering debug:", {
    totalEvents: events.length,
    filteredEvents: filteredEvents.length,
    searchTerm,
    dateFilters: { startDate, endDate },
    sampleEvents: events.slice(0, 3).map(e => ({
      title: e.title,
      date: e.date
    }))
  });

  return (
    <div className="home">
      {/* -------------------------
            WELCOME BANNER
      ------------------------- */}
      {showWelcome && (
        <div className="welcome-banner">
          Welcome back, <strong>{username}</strong> 👋
        </div>
      )}

      {/* -------------------------
            LEFT FILTER PANEL
      ------------------------- */}
      <aside className="filters">
        <h3>DATE</h3>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

      </aside>

      {/* -------------------------
            RESULTS SECTION
      ------------------------- */}
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

        {/* -------------------------
                EVENT GRID
                (USES EventCard!)
        ------------------------- */}
        <div className="grid">
          {filteredEvents.map((event) => (
            <EventCard 
              key={event._id || event.id}
              event={event}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
