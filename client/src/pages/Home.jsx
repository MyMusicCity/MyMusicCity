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
        // Try the current events endpoint first with cache busting
        const cacheBreaker = Date.now();
        console.log('🔍 Fetching current events with cache breaker:', cacheBreaker);
        const response = await fetch(`${API_BASE}/api/events/current?_cb=${cacheBreaker}`);
        const apiEvents = await response.json();
        
        console.log('📊 Current events response:', {
          status: response.status,
          eventCount: Array.isArray(apiEvents) ? apiEvents.length : 'not array',
          sample: Array.isArray(apiEvents) ? apiEvents.slice(0, 2).map(e => ({ title: e.title, date: e.date, source: e.source })) : 'no sample'
        });
        
        // Also check debug endpoint
        try {
          const debugResponse = await fetch(`${API_BASE}/api/debug/events?_cb=${cacheBreaker}`);
          const debugData = await debugResponse.json();
          console.log('🔧 DEBUG - Database stats:', debugData);
        } catch (debugErr) {
          console.log('⚠️ Debug endpoint failed:', debugErr.message);
        }
        
        if (mounted && Array.isArray(apiEvents) && apiEvents.length > 0) {
          setEvents(apiEvents);
          setLoading(false);
          return;
        }
        
        // If no current events, try all events
        console.log('⚠️ No current events, trying all events...');
        const allResponse = await fetch(`${API_BASE}/api/events`);
        const allEvents = await allResponse.json();
        
        console.log('📊 All events response:', {
          status: allResponse.status,
          eventCount: Array.isArray(allEvents) ? allEvents.length : 'not array'
        });
        
        if (mounted && Array.isArray(allEvents) && allEvents.length > 0) {
          // Filter to recent events on client side
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          
          const recentEvents = allEvents.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= twoWeeksAgo;
          });
          
          console.log('📅 Filtered events:', {
            total: allEvents.length,
            recent: recentEvents.length,
            cutoffDate: twoWeeksAgo.toISOString()
          });
          
          setEvents(recentEvents.length > 0 ? recentEvents : allEvents.slice(0, 20));
          setLoading(false);
          return;
        }
        
      } catch (err) {
        console.log('API endpoints failed:', err.message);
      }

      // Final fallback to mock events if all endpoints fail
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
    .sort((a, b) => {
      if (sortBy === "Soonest") {
        // Sort by date ascending (soonest first)
        return new Date(a.date) - new Date(b.date);
      } else if (sortBy === "Most Popular") {
        // Sort by popularity (rsvpCount + commentCount) descending
        const popularityA = (a.rsvpCount || 0) + (a.commentCount || 0);
        const popularityB = (b.rsvpCount || 0) + (b.commentCount || 0);
        if (popularityA !== popularityB) {
          return popularityB - popularityA; // Higher popularity first
        }
        // If popularity is equal, sort by date (soonest first)
        return new Date(a.date) - new Date(b.date);
      } else {
        // Default fallback - sort by date descending (latest first)
        return new Date(b.date) - new Date(a.date);
      }
    });

  // Debug logging
  console.log("🔍 Event filtering debug:", {
    totalEvents: events.length,
    filteredEvents: filteredEvents.length,
    searchTerm,
    dateFilters: { startDate, endDate },
    sortBy,
    popularityData: events.slice(0, 3).map(e => ({
      title: e.title?.substring(0, 30),
      rsvpCount: e.rsvpCount || 0,
      commentCount: e.commentCount || 0,
      popularity: (e.rsvpCount || 0) + (e.commentCount || 0)
    })),
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
        <h3>Filters</h3>
        <div className="filter-group">
          <label className="filter-label">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="From date..."
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="To date..."
          />
        </div>
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
