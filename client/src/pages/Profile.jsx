import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FaPen, FaCheck, FaTimes, FaExclamationTriangle } from "react-icons/fa";
import { AuthContext } from "../AuthContext";
import { getCurrentUser, updateUserProfile } from "../api";
import "../styles.css";

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useContext(AuthContext);
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [editing, setEditing] = useState({
    year: false,
    major: false,
  });
  
  const [editValues, setEditValues] = useState({
    year: "",
    major: "",
  });

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!authUser) {
        navigate("/login");
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const userData = await getCurrentUser();
        setProfile(userData);
        setEditValues({
          year: userData.year || "",
          major: userData.major || "",
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        
        // Provide more specific error messages
        if (err.message.includes("User not found")) {
          setError("Your profile is being created. Please try refreshing the page in a moment.");
        } else if (err.message.includes("Unable to create user profile")) {
          setError("There was an issue setting up your profile. Please contact support.");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [authUser, navigate]);

  const handleEdit = (field) => {
    setEditing({ ...editing, [field]: !editing[field] });
    if (!editing[field]) {
      // Starting to edit, reset edit value to current profile value
      setEditValues({ ...editValues, [field]: profile[field] || "" });
    }
  };

  const handleSave = async (field) => {
    try {
      setSaving(true);
      const updateData = { [field]: editValues[field] };
      const updatedUser = await updateUserProfile(updateData);
      setProfile(updatedUser);
      setEditing({ ...editing, [field]: false });
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (field) => {
    setEditing({ ...editing, [field]: false });
    setEditValues({ ...editValues, [field]: profile[field] || "" });
  };

  const handleChange = (field, value) => {
    setEditValues({ ...editValues, [field]: value });
  };

  const handleKeyPress = (e, field) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave(field);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel(field);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <div className="loading-spinner">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-page">
        <div className="profile-card">
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
          <div className="profile-actions">
            <button onClick={() => window.location.reload()} className="retry-btn">
              Refresh Page
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Sign Out and Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avatarLetter = (profile?.username || profile?.email || "?")[0].toUpperCase();
  const profileIncomplete = !profile?.profileComplete;

  return (
    <div className="profile-page">
      <div className="profile-card">
        {authUser?.picture ? (
          <img src={authUser.picture} alt="Profile" className="profile-avatar-img" />
        ) : (
          <div className="profile-avatar">{avatarLetter}</div>
        )}
        
        <h2 className="profile-name">{profile?.username || authUser?.name || "User"}</h2>
        <p className="profile-email">{profile?.email || authUser?.email}</p>
        
        {profile?.createdAt && (
          <p className="profile-date">
            Member since: {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        )}

        {profileIncomplete && (
          <div className="profile-completion-notice">
            <FaExclamationTriangle className="warning-icon" />
            Complete your profile to RSVP to events
          </div>
        )}

        <div className="profile-details">
          <div className="profile-field">
            <strong>Year:</strong>{" "}
            {editing.year ? (
              <div className="edit-controls">
                <input
                  type="text"
                  value={editValues.year}
                  onChange={(e) => handleChange("year", e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, "year")}
                  className="editable-input"
                  placeholder="e.g., Sophomore, Graduate"
                  autoFocus
                  disabled={saving}
                />
                <div className="edit-buttons">
                  <button 
                    onClick={() => handleSave("year")} 
                    disabled={saving}
                    className="save-btn"
                  >
                    <FaCheck />
                  </button>
                  <button 
                    onClick={() => handleCancel("year")} 
                    disabled={saving}
                    className="cancel-btn"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ) : (
              <span className="field-value">
                {profile?.year || "Not set"}{" "}
                <FaPen
                  className="edit-icon"
                  onClick={() => handleEdit("year")}
                />
              </span>
            )}
          </div>

          <div className="profile-field">
            <strong>Major:</strong>{" "}
            {editing.major ? (
              <div className="edit-controls">
                <input
                  type="text"
                  value={editValues.major}
                  onChange={(e) => handleChange("major", e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, "major")}
                  className="editable-input"
                  placeholder="e.g., Computer Science, Music"
                  autoFocus
                  disabled={saving}
                />
                <div className="edit-buttons">
                  <button 
                    onClick={() => handleSave("major")} 
                    disabled={saving}
                    className="save-btn"
                  >
                    <FaCheck />
                  </button>
                  <button 
                    onClick={() => handleCancel("major")} 
                    disabled={saving}
                    className="cancel-btn"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ) : (
              <span className="field-value">
                {profile?.major || "Not set"}{" "}
                <FaPen
                  className="edit-icon"
                  onClick={() => handleEdit("major")}
                />
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <div className="profile-actions">
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
