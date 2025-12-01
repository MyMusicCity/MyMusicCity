import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUserById } from "../api";
import "../styles.css";

// Helper function for consistent avatar generation
const getAvatarText = (username, email) => {
  if (!username && !email) return "?";
  const text = username || email;
  return text[0].toUpperCase();
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
        <div className="profile-avatar">{getAvatarText(user.username, user.email)}</div>
        <h2 className="profile-name">{user.username}</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>
    </div>
  );
}
