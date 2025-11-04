import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPen } from "react-icons/fa";
import "../styles.css";

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "",
    year: "Senior",
    major: "Imaginary Numbers",
    email: "",
    bio: "laufey for life",
    memberSince: "October 1, 2023",
  });

  const [editing, setEditing] = useState({
    bio: false,
    year: false,
    major: false,
    email: false,
  });

  // ✅ Load user info from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setProfile((prev) => ({
        ...prev,
        name: user.username || "Unnamed User",
        email: user.email || "No email provided",
      }));
    } else {
      // If not logged in, redirect to login page
      navigate("/login");
    }
  }, [navigate]);

  const handleEdit = (field) => {
    setEditing({ ...editing, [field]: !editing[field] });
  };

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleKeyPress = (e, field) => {
    if (e.key === "Enter") handleEdit(field);
  };

  // ✅ Log out function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Compute avatar letter dynamically
  const avatarLetter = profile.name ? profile.name[0].toUpperCase() : "?";

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{avatarLetter}</div>
        <h2 className="profile-name">{profile.name}</h2>
        <p className="profile-date">Member since: {profile.memberSince}</p>

        {/* BIO */}
        <div className="editable-line">
          {editing.bio ? (
            <input
              type="text"
              value={profile.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, "bio")}
              className="editable-input"
              autoFocus
            />
          ) : (
            <p className="profile-bio">
              {profile.bio}{" "}
              <FaPen className="edit-icon" onClick={() => handleEdit("bio")} />
            </p>
          )}
        </div>

        <div className="profile-details">
          <p>
            <strong>Year:</strong>{" "}
            {editing.year ? (
              <input
                type="text"
                value={profile.year}
                onChange={(e) => handleChange("year", e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, "year")}
                className="editable-input"
                autoFocus
              />
            ) : (
              <>
                {profile.year}{" "}
                <FaPen
                  className="edit-icon"
                  onClick={() => handleEdit("year")}
                />
              </>
            )}
          </p>

          <p>
            <strong>Major:</strong>{" "}
            {editing.major ? (
              <input
                type="text"
                value={profile.major}
                onChange={(e) => handleChange("major", e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, "major")}
                className="editable-input"
                autoFocus
              />
            ) : (
              <>
                {profile.major}{" "}
                <FaPen
                  className="edit-icon"
                  onClick={() => handleEdit("major")}
                />
              </>
            )}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {editing.email ? (
              <input
                type="text"
                value={profile.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, "email")}
                className="editable-input"
                autoFocus
              />
            ) : (
              <>
                {profile.email}{" "}
                <FaPen
                  className="edit-icon"
                  onClick={() => handleEdit("email")}
                />
              </>
            )}
          </p>
        </div>

        <button className="deactivate-btn">Deactivate account</button>

        {/* ✅ New logout button */}
        <button className="logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
