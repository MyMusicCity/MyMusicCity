// client/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import "../styles.css";
import { FiSearch } from "react-icons/fi";
import LoadingSpinner from "../components/LoadingSpinner";
import { ping, getEvents } from "../api";
import EventCard from "../components/EventCard"; // ⭐ Use EventCard everywhere

// Temporary fallback data for local dev
const MOCK_EVENTS = [
  {
    id: 1,
    title: "Celebrate Nashville",
    location: "Centennial Park",
    date: "OCT 4, 2025",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 2,
    title: "Basement East — Local Showcase",
    location: "The Basement East",
    date: "OCT 6, 2025",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=240&fit=crop&auto=format",
  },
  {
    id: 3,
    title: "Jazz Night on 5th",
    location: "Printer’s Alley",
    date: "OCT 9, 2025",
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=240&fit=crop&auto=format",
  },
];

// Infer genre from title text
function inferGenre(title = "") {
  title = title.toLowerCase();
  if (title.includes("jazz")) return "Jazz";
  if (title.includes("country")) return "Country";
  if (title.includes("rap") || title.includes("hip-hop")) return "Rap";
  if (title.includes("pop")) return "Pop";
  return "Other";
}

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("Most Popular");
  const [showWelcome, setShowWelcome] = useState(false);
  const [username, setUsername] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [genres, setGenres] = useState([]); // selected genres
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
        const response = await fetch('/api/events/current');
        const apiEvents = await response.json();
        
        if (mounted && Array.isArray(apiEvents) && apiEvents.length > 0) {
          setEvents(apiEvents);
          setLoading(false);
          return;
        }
      } catch (err) {
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
        } catch (err2) {}
      }

      // Fallback to mock events if backend unreachable
      setTimeout(() => {
        if (mounted) {
          setEvents(MOCK_EVENTS);
          setLoading(false);
        }
      }, 600);
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

      const inferred = inferGenre(e.title);
      const matchesGenre =
        genres.length === 0 || genres.includes(inferred);

      let matchesDate = true;
      if (startDate || endDate) {
        const eventDate = new Date(e.date);
        if (startDate && eventDate < new Date(startDate)) matchesDate = false;
        if (endDate && eventDate > new Date(endDate)) matchesDate = false;
      }

      return matchesSearch && matchesGenre && matchesDate;
    })
    .sort((a, b) =>
      sortBy === "Soonest"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date)
    );

  const toggleGenre = (genre) => {
    setGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

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

        <h3>GENRES</h3>
        {["Pop", "Rap", "Country", "Jazz"].map((genre) => (
          <label key={genre}>
            <input
              type="checkbox"
              checked={genres.includes(genre)}
              onChange={() => toggleGenre(genre)}
            />{" "}
            {genre}
          </label>
        ))}
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
