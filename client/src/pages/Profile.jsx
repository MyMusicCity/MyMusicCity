import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FaPen, FaCheck, FaTimes, FaExclamationTriangle } from "react-icons/fa";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthContext } from "../AuthContext";
import { getCurrentUser, updateUserProfile, deleteAccount } from "../api";
import "../styles.css";

// Helper function for Vanderbilt-themed avatar generation (First letter only)
const getAvatarText = (username, email, fullName) => {
  // Try to get first letter from full name first
  if (fullName && fullName.trim()) {
    return fullName.trim()[0].toUpperCase();
  }
  
  // Try to get first letter from username
  if (username && username.trim()) {
    return username.trim()[0].toUpperCase();
  }
  
  // Fallback to email
  if (email && email.trim()) {
    return email[0].toUpperCase();
  }
  
  return "?";
};

export default function Profile() {
  const navigate = useNavigate();
  const { user: contextUser, logout } = useContext(AuthContext);
  const { user: auth0User, getAccessTokenSilently } = useAuth0();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false); // Add edit mode toggle
  
  const [editValues, setEditValues] = useState({
    username: "",
    email: "",
    year: "",
    major: "",
    phone: "", // Optional phone number
  });
  
  // Check if required fields are filled for save button (phone is optional)
  const canSave = editValues.username.trim() && editValues.email.trim() && editValues.year.trim() && editValues.major.trim();

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!contextUser) {
        navigate("/login");
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const userData = await getCurrentUser();
        setProfile(userData);
        
        // Set edit mode based on profile completeness
        const isComplete = userData.username && userData.email && userData.year && userData.major;
        setEditMode(!isComplete);
        
        // Initialize edit values with current profile data
        setEditValues({
          username: userData.username || "",
          email: userData.email || "",
          year: userData.year || "",
          major: userData.major || "",
          phone: userData.phone || "",
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        
        // Provide more specific error messages and auto-suggestions
        if (err.message.includes("User profile not found")) {
          setError("We're setting up your profile. Please try refreshing the page, or sign out and back in if this continues.");
        } else if (err.message.includes("INVALID_TOKEN_CLAIMS") || err.code === 'INVALID_TOKEN_CLAIMS') {
          setError("Authentication issue detected. You may need to delete your account to resolve this.");
          // Auto-suggest account deletion after a delay
          setTimeout(() => {
            if (window.confirm('Profile loading failed due to invalid authentication. Would you like to delete your account to resolve this issue?')) {
              handleDeleteAccount();
            }
          }, 3000);
        } else if (err.code === 'ACCOUNT_CONFLICT') {
          setError("Account conflict detected. Delete your account below to resolve this.");
        } else if (err.status === 401) {
          setError("Authentication failed. You may need to delete your account to resolve this.");
        } else if (err.message.includes("Unable to create user profile")) {
          setError("There was an issue creating your profile. This may be due to a data conflict. Please try deleting your account below, or contact support with this exact message: " + err.message);
        } else if (err.message.includes("Authentication required")) {
          setError("Please sign in again to access your profile.");
          setTimeout(() => navigate("/login"), 2000);
        } else if (err.message.includes("Username conflict") || err.message.includes("Email already exists") || err.message.includes("Account conflict")) {
          setError("Account conflict detected: " + err.message + " Try deleting your account below or contact support for assistance.");
        } else {
          setError(`Failed to load profile: ${err.message}. Try deleting your account if this persists.`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [contextUser, navigate]);

  const handleSaveProfile = async () => {
    if (!canSave) {
      setError("Please fill in all fields before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const updatedUser = await updateUserProfile(editValues);
      setProfile(updatedUser);
      setEditMode(false); // Exit edit mode
      setError("");
      // Don't reload page, just update state
    } catch (err) {
      console.error("Failed to update profile:", err);
      if (err.message.includes("USERNAME_TAKEN")) {
        setError("Username already taken. Please choose another.");
      } else if (err.message.includes("INVALID_EMAIL")) {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Failed to save profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleEditProfile = () => {
    setEditMode(true);
    setError("");
  };

  const handleCancelEdit = () => {
    // Reset edit values to current profile data
    setEditValues({
      username: profile?.username || "",
      email: profile?.email || "",
      year: profile?.year || "",
      major: profile?.major || "",
      phone: profile?.phone || "",
    });
    setEditMode(false);
    setError("");
  };

  const handleCleanupLegacy = async () => {
    if (!window.confirm("This will clean up any old account data that may be causing conflicts. Continue?")) {
      return;
    }

    try {
      setDeleting(true);
      const headers = { "Content-Type": "application/json" };
      
      if (getAccessTokenSilently) {
        const token = await getAccessTokenSilently();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || window.location.origin}/api/cleanup-legacy`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }
        
        // Special handling for auth errors
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign out and sign back in, then try again.');
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to cleanup legacy accounts');
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
      setError(null);
      
      let email = contextUser?.email || auth0User?.email;
      if (!email) {
        // If no email from auth contexts, prompt user to enter it
        email = prompt('Enter your email address for emergency cleanup:');
        if (!email) {
          throw new Error('Email is required for emergency cleanup');
        }
      }

      const result = await fetch(`${process.env.REACT_APP_API_URL || window.location.origin}/api/emergency-cleanup`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!result.ok) {
        const errorData = await result.json().catch(() => ({ error: 'Failed to cleanup' }));
        throw new Error(errorData.error || 'Emergency cleanup failed');
      }

      const cleanupResult = await result.json();
      
      alert(`Emergency cleanup successful! Removed ${cleanupResult.deletedAccounts} accounts. Please sign out and sign back in to create a fresh account.`);
      logout();
      navigate("/");
    } catch (err) {
      console.error('Emergency cleanup failed:', err);
      if (err.status === 401) {
        setError('Authentication required. This is normal for emergency cleanup - the operation may have succeeded anyway.');
      } else {
        setError(`Emergency cleanup failed: ${err.message || err}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This will permanently remove your account, all RSVPs, and clean up any old account data. This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      
      await deleteAccount();
      
      alert("Account successfully deleted. You will now be signed out.");
      logout();
      navigate("/");
    } catch (err) {
      console.error("Failed to delete account:", err);
      setError(`Failed to delete account: ${err.message || 'Unknown error'}. Please contact support if this persists.`);
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
            
            {/* Simplified account management */}
            <div className="account-management">
              <button 
                className="delete-account-btn" 
                onClick={handleDeleteAccount}
                disabled={deleting}
                title="Permanently delete your account and all data"
              >
                {deleting ? 'Deleting...' : '🗑️ Delete Account & Clean Up'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avatarLetter = getAvatarText(profile?.username, profile?.email, auth0User?.name);
  const profileIncomplete = !profile?.username || !profile?.email || !profile?.year || !profile?.major;

  return (
    <div className="profile-page">
      <div className="profile-card">
        {auth0User?.picture ? (
          <img src={auth0User.picture} alt="Profile" className="profile-avatar-img" />
        ) : (
          <div className="profile-avatar">{avatarLetter}</div>
        )}
        
        <h2 className="profile-name">{profile?.username || "User"}</h2>
        <p className="profile-email">{profile?.email || "No email set"}</p>
        
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

        {editMode ? (
          <div className="profile-form">
            <div className="form-field">
              <label><strong>Username:</strong></label>
              <input
                type="text"
                value={editValues.username}
                onChange={(e) => setEditValues({...editValues, username: e.target.value})}
                placeholder="Enter username"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label><strong>Email:</strong></label>
              <input
                type="email"
                value={editValues.email}
                onChange={(e) => setEditValues({...editValues, email: e.target.value})}
                placeholder="Enter email"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label><strong>Year:</strong></label>
              <input
                type="text"
                value={editValues.year}
                onChange={(e) => setEditValues({...editValues, year: e.target.value})}
                placeholder="e.g., Sophomore, Graduate"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label><strong>Major:</strong></label>
              <input
                type="text"
                value={editValues.major}
                onChange={(e) => setEditValues({...editValues, major: e.target.value})}
                placeholder="e.g., Computer Science, Music"
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label><strong>Phone Number:</strong> <span className="optional-label">(optional)</span></label>
              <input
                type="tel"
                value={editValues.phone}
                onChange={(e) => setEditValues({...editValues, phone: e.target.value})}
                placeholder="e.g., (615) 123-4567"
                disabled={saving}
              />
            </div>

            <div className="profile-edit-actions">
              <button 
                className="save-profile-btn"
                onClick={handleSaveProfile}
                disabled={saving || !canSave}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
              <button 
                className="cancel-edit-btn"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-display">
            <div className="profile-details">
              <p><strong>Username:</strong> {profile?.username || "Not set"}</p>
              <p><strong>Email:</strong> {profile?.email || "Not set"}</p>
              <p><strong>Year:</strong> {profile?.year || "Not set"}</p>
              <p><strong>Major:</strong> {profile?.major || "Not set"}</p>
              {profile?.phone && <p><strong>Phone:</strong> {profile.phone}</p>}
            </div>
            <button className="edit-profile-btn" onClick={handleEditProfile}>
              <FaPen /> Edit Profile
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <div className="profile-actions">
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
          
          {(error || profileIncomplete) && (
            <div className="account-management">
              <button 
                className="delete-account-btn" 
                onClick={handleDeleteAccount}
                disabled={deleting}
                title="Permanently delete your account and all data"
              >
                {deleting ? 'Deleting...' : '🗑️ Delete Account & Clean Up'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
