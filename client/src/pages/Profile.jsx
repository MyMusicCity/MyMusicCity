import React, { useState } from "react";
import { FaPen } from "react-icons/fa";
import "../styles.css";

export default function Profile() {
  const [profile, setProfile] = useState({
    name: "Emma Chang",
    year: "Senior",
    major: "Imaginary Numbers",
    email: "emma.j.chang@vanderbilt.edu",
    bio: "laufey for life",
    memberSince: "October 1, 2023",
  });

  const [editing, setEditing] = useState({
    bio: false,
    year: false,
    major: false,
    email: false,
  });

  const handleEdit = (field) => {
    setEditing({ ...editing, [field]: !editing[field] });
  };

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleKeyPress = (e, field) => {
    if (e.key === "Enter") handleEdit(field);
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">E</div>
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
      </div>
    </div>
  );
}
