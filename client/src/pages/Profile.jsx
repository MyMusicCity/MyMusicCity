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
  const [deleting, setDeleting] = useState(false);
  
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
        if (err.message.includes("User profile not found")) {
          setError("We're setting up your profile. Please try refreshing the page, or sign out and back in if this continues.");
        } else if (err.message.includes("Unable to create user profile")) {
          setError("There was an issue creating your profile. This may be due to a data conflict. Please try the 'Clean Up Account' option below, or contact support with this exact message: " + err.message);
        } else if (err.message.includes("Authentication required")) {
          setError("Please sign in again to access your profile.");
          setTimeout(() => navigate("/login"), 2000);
        } else if (err.message.includes("Username conflict") || err.message.includes("Email already exists") || err.message.includes("Account conflict")) {
          setError("Account conflict detected: " + err.message + " Try the 'Clean Up Account' option below or contact support for assistance.");
        } else {
          setError(`Profile loading failed: ${err.message}. If you had an account before our Auth0 migration, try the 'Clean Up Account' option below.`);
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

  const handleCleanupLegacy = async () => {
    if (!window.confirm("This will clean up any old account data that may be causing conflicts. Continue?")) {
      return;
    }

    try {
      setDeleting(true);
      const headers = { "Content-Type": "application/json" };
      
      if (authUser?.getAccessTokenSilently) {
        const token = await authUser.getAccessTokenSilently();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || window.location.origin}/api/cleanup-legacy`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup legacy accounts');
      }

      const result = await response.json();
      if (result.deletedAccounts > 0) {
        alert(`Cleanup successful! Removed ${result.deletedAccounts} conflicting accounts. Please refresh the page to see if your issues are resolved.`);
        window.location.reload();
      } else {
        alert('No conflicting accounts found. Your account appears to be clean.');
      }
    } catch (err) {
      console.error('Failed to cleanup legacy accounts:', err);
      
      // Check if it's an authentication error
      const isAuthError = err.message.includes('Authorization') || err.message.includes('Unauthorized') || err.message.includes('Missing Authorization header');
      
      // If regular cleanup fails, offer emergency cleanup
      const message = isAuthError 
        ? `Authentication failed for regular cleanup.\n\nTry emergency cleanup? This will delete ALL accounts with your email and let you start fresh.`
        : `Regular cleanup failed: ${err.message}\n\nTry emergency cleanup? This will delete ALL accounts with your email and let you start fresh.`;
        
      if (window.confirm(message)) {
        handleEmergencyCleanup();
      } else {
        setError(`Failed to cleanup accounts: ${err.message}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleEmergencyCleanup = async () => {
    try {
      setDeleting(true);
      
      let email = authUser?.email;
      if (!email) {
        // If no email from authUser, prompt user to enter it
        email = prompt('Enter your email address for emergency cleanup:');
        if (!email) {
          throw new Error('Email is required for emergency cleanup');
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || window.location.origin}/api/emergency-cleanup`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to perform emergency cleanup';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the response status
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error('Server returned invalid response format');
      }
      
      alert(`Emergency cleanup successful! Removed ${result.deletedAccounts} accounts. Please sign out and sign back in to create a fresh account.`);
      logout();
      navigate("/");
    } catch (err) {
      console.error('Emergency cleanup failed:', err);
      setError(`Emergency cleanup failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone and will remove all your RSVPs.")) {
      return;
    }
    
    if (!window.confirm("This will permanently delete your account and all associated data. Are you absolutely sure?")) {
      return;
    }

    try {
      setDeleting(true);
      const headers = { "Content-Type": "application/json" };
      
      // Get Auth0 token using the authUser context
      if (authUser && typeof authUser.getAccessTokenSilently === 'function') {
        const token = await authUser.getAccessTokenSilently();
        headers.Authorization = `Bearer ${token}`;
      }

      const API_BASE = process.env.REACT_APP_API_URL || window.location.origin;
      const response = await fetch(`${API_BASE}/api/me/account`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      alert('Account successfully deleted. You will now be signed out.');
      logout();
      navigate("/");
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError(`Failed to delete account: ${err.message}`);
    } finally {
      setDeleting(false);
    }
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
            
            <div className="account-management">
              <button 
                className="cleanup-account-btn"
                onClick={handleCleanupLegacy}
                disabled={deleting}
                title="Clean up conflicting legacy account data from before Auth0 migration"
              >
                {deleting ? "Cleaning..." : "🧹 Clean Up Account"}
              </button>
              
              <button 
                className="delete-account-btn" 
                onClick={handleDeleteAccount}
                disabled={deleting}
                title="Permanently delete your account and all data"
              >
                {deleting ? 'Deleting...' : '🗑️ Delete My Account'}
              </button>
            </div>
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
          
          <div className="account-management">
            <button 
              className="cleanup-account-btn"
              onClick={handleCleanupLegacy}
              disabled={deleting}
              title="Clean up conflicting legacy account data from before Auth0 migration"
            >
              {deleting ? "Cleaning..." : "🧹 Clean Up Account"}
            </button>
            
            <button 
              className="delete-account-btn" 
              onClick={handleDeleteAccount}
              disabled={deleting}
              title="Permanently delete your account and all data"
            >
              {deleting ? 'Deleting...' : '🗑️ Delete My Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
