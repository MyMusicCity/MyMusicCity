import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import "../styles.css";
import { AuthContext } from "../AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated, isLoading, error } = useAuth0();
  const { token } = useContext(AuthContext);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, token, navigate]);

  const handleLogin = () => {
    loginWithRedirect();
  };

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="error-message">
            <h2>Authentication Error</h2>
            <p>{error.message}</p>
            <button className="auth-button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1 className="hero-title">MyMusicCity</h1>
        <p className="hero-subtitle">Your gateway to Nashville's vibrant music scene</p>
      </div>
      
      <div className="login-card">
        <h2>Welcome to MyMusicCity</h2>
        
        <div className="login-content">
          <div className="vanderbilt-notice">
            <h3>🎓 Vanderbilt Students Only</h3>
            <p>Access is restricted to students with @vanderbilt.edu email addresses</p>
          </div>
          
          <div className="auth-section">
            <button className="auth-button primary" onClick={handleLogin}>
              🔐 Sign In with Vanderbilt Account
            </button>
            
            <div className="auth-info">
              <p>Secure authentication powered by Auth0</p>
              <p className="privacy-note">
                We'll redirect you to a secure login page. Your credentials are never stored on our servers.
              </p>
            </div>
          </div>
          
          <div className="features-preview">
            <h4>What you can do:</h4>
            <ul>
              <li>🎵 Discover live music events</li>
              <li>📅 RSVP to concerts and shows</li>
              <li>💬 Comment and connect with fellow music lovers</li>
              <li>📍 Find events by location and genre</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}