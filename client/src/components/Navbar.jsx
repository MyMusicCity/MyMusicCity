import React from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaUser } from "react-icons/fa";
import { FaCommentDots } from "react-icons/fa6";
import "../styles.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">MyMusicCity</Link>
      <div className="nav-icons">
        <Link to="/rsvps">
          <FaHeart className="nav-icon" title="My RSVPs" />
        </Link>
        <Link to="/profile">
          <FaUser className="nav-icon" title="Profile" />
        </Link>
      </div>
    </nav>
  );
}
