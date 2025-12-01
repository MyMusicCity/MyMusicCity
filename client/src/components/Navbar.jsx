import React, { useContext, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaUser, FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { FaCommentDots } from "react-icons/fa6";
import { AuthContext } from "../AuthContext";
import "../styles.css";

export default function Navbar() {
  const { logout, user, isAuthenticated, login } = useContext(AuthContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 300); // 300ms delay before closing
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">MyMusicCity</Link>
      <div className="nav-icons">
        {isAuthenticated ? (
          <>
            <Link to="/rsvps" className="nav-link-with-text" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              textDecoration: 'none',
              color: '#333',
              fontWeight: '500',
              padding: '8px 12px',
              borderRadius: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaHeart className="nav-icon" title="My RSVPs" />
              <span style={{ fontSize: '14px' }}>My RSVPs</span>
            </Link>
            
            {/* User profile dropdown */}
            <div className="user-dropdown" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <div className="user-menu-trigger">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="user-avatar" />
                ) : (
                  <FaUser className="nav-icon" />
                )}
                <FaChevronDown className="dropdown-arrow" />
              </div>
              
              {showDropdown && (
                <div className="user-dropdown-menu" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
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
          </>
        ) : (
          /* Show login button for unauthenticated users */
          <Link to="/login" className="nav-login-btn">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
