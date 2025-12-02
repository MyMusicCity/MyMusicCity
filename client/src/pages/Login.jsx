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
      <div className="login-container">
        <div className="login-left">
          <h1 className="brand">MyMusicCity</h1>
          <div className="login-card">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
        <div className="login-right">
          <div className="overlay">
            <h1 className="login-hero-text">
              Your<br />Music<br />City.
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-container">
        <div className="login-left">
          <h1 className="brand">MyMusicCity</h1>
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
        <div className="login-right">
          <div className="overlay">
            <h1 className="login-hero-text">
              Your<br />Music<br />City.
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <h1 className="brand">MyMusicCity</h1>
        <div className="login-card">
          <h2>Welcome Back</h2>
          
          <div className="vanderbilt-notice">
            <p>🎓 For Vanderbilt Students</p>
            <small>Secure access with your @vanderbilt.edu account</small>
          </div>
          
          <button className="auth-button primary" onClick={handleLogin}>
            🔐 Sign In with Vanderbilt Account
          </button>
          
          <div className="auth-info">
            <p>Powered by Auth0</p>
            <small>Your credentials are never stored on our servers</small>
          </div>
          
          <div className="features-preview">
            <small>Discover • RSVP • Connect • Explore</small>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="overlay">
          <h1 className="login-hero-text">
            Your<br />Music<br />City.
          </h1>
        </div>
      </div>
    </div>
  );
}