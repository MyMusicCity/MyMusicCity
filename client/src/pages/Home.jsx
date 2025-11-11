// client/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import "../styles.css";
import { FiSearch } from "react-icons/fi";
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

// Helper: infer a "genre" tag from title text (temporary until genre exists in DB)
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
      } catch (err) {}

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

  // ✅ Filtering logic
  const filteredEvents = events
    .filter((e) => {
      // title search
      const matchesSearch = e.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      // genre filtering
      const inferred = inferGenre(e.title);
      const matchesGenre =
        genres.length === 0 || genres.includes(inferred);

      // date filtering (only if startDate or endDate selected)
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

  // ✅ Toggle genre selection
  const toggleGenre = (genre) => {
    setGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

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

        <div className="grid">
          {filteredEvents.map((e) => (
            <Link
              key={e._id || e.id}
              to={`/event/${e._id || e.id}`}
              state={{ event: e }}
              className="event-card"
            >
              <img 
                src={e.image || `https://picsum.photos/400/240?random=${e._id || e.id || Math.floor(Math.random() * 100)}`}
                alt={e.title} 
                className="event-img"
                onError={(event) => {
                  // Final fallback if all else fails
                  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgdmlld0JveD0iMCAwIDQwMCAyNDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODUuNSAxMjBMMjAwIDEwNS41TDIxNC41IDEyMEwyMDAgMTM0LjVMMTg1LjUgMTIwWiIgZmlsbD0iIzk0QTNCOCIvPgo8L3N2Zz4K';
                }}
              />
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
