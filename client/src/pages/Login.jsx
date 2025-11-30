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
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome to MyMusicCity</h1>
          <p className="login-subtitle">Discover Nashville's Music Scene</p>
        </div>
        
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
    } catch (err) {
      console.error("Login/signup error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <h1 className="brand">MyMusicCity</h1>
        <div className="login-card">
          <h2>{isSignup ? "Create Account" : "Log In"}</h2>
          <form onSubmit={handleSubmit}>
            {isSignup && (
              <>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="year"
                  placeholder="Year (e.g. Senior)"
                  value={form.year}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="major"
                  placeholder="Major (e.g. Computer Science)"
                  value={form.major}
                  onChange={handleChange}
                  required
                />
              </>
            )}
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading
                ? isSignup
                  ? "Signing up..."
                  : "Logging in..."
                : isSignup
                ? "Sign Up"
                : "Log In"}
            </button>
          </form>
          <p className="toggle-text">
            {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
            <span onClick={() => setIsSignup(!isSignup)} className="toggle-link">
              {isSignup ? "Log in" : "Sign up"}
            </span>
          </p>
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
