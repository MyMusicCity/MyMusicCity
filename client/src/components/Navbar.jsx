import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaUser, FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { FaCommentDots } from "react-icons/fa6";
import { AuthContext } from "../AuthContext";
import "../styles.css";

export default function Navbar() {
  const { logout, user } = useContext(AuthContext);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">MyMusicCity</Link>
      <div className="nav-icons">
        <Link to="/rsvps">
          <FaHeart className="nav-icon" title="My RSVPs" />
        </Link>
        
        {/* User profile dropdown */}
        <div className="user-dropdown" onMouseEnter={() => setShowDropdown(true)} onMouseLeave={() => setShowDropdown(false)}>
          <div className="user-menu-trigger">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="user-avatar" />
            ) : (
              <FaUser className="nav-icon" />
            )}
            <FaChevronDown className="dropdown-arrow" />
          </div>
          
          {showDropdown && (
            <div className="user-dropdown-menu">
              <div className="user-info">
                <div className="user-name">{user?.name || user?.username}</div>
                <div className="user-email">{user?.email}</div>
              </div>
              <hr className="dropdown-divider" />
              <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                <FaUser /> Profile
              </Link>
              <button className="dropdown-item logout-button" onClick={handleLogout}>
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
