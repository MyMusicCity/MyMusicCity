import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <nav className="navbar">
      <Link to="/" className="logo">MyMusicCity</Link>
      <div className="nav-icons">
        <Link to="/messages" className={isActive("/messages")}>💬</Link>
        <Link to="/rsvps" className={isActive("/rsvps")}>❤️</Link>
        <Link to="/profile" className={isActive("/profile")}>👤</Link>
      </div>
    </nav>
  );
}
