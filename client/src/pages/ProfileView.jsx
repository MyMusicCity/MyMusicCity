import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserById } from "../api";
import "../styles.css";

// Helper function for Vanderbilt-themed avatar generation (First + Last initials)
const getAvatarText = (username, email, fullName) => {
  // Try to get initials from full name first
  if (fullName && fullName.trim()) {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }
  
  // Try to extract from username (if it looks like "firstname lastname" or "firstnamelastname")
  if (username && username.trim()) {
    const parts = username.trim().split(/[\s._-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username[0].toUpperCase();
  }
  
  // Fallback to email
  if (email && email.trim()) {
    return email[0].toUpperCase();
  }
  
  return "?";
};

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await getUserById(id);
        if (mounted) setUser(u);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load user");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  if (loading) return <div style={{ padding: "2rem" }}>Loading profile...</div>;
  if (error) return (
    <div style={{ padding: "2rem" }}>
      <h2>Error</h2>
      <p className="error">{error}</p>
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">{getAvatarText(user.username, user.email, null)}</div>
        <h2 className="profile-name">{user.username}</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>
    </div>
  );
}
