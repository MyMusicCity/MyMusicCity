import React, { useContext } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import EventDetails from "./pages/EventDetails";
import Profile from "./pages/Profile";
import ProfileView from "./pages/ProfileView";
import RSVPs from "./pages/RSVPs";
import Login from "./pages/Login";
import { AuthContext } from "./AuthContext";

export default function App() {
  const { isLoading: auth0Loading } = useAuth0();
  const { token, isLoading, isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  // Hide navbar on login or signup pages
  const hideNavbar = ["/login", "/signup"].includes(location.pathname);

  // Show loading spinner while Auth0 is initializing
  if (auth0Loading || isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading MyMusicCity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Only show navbar if logged in AND not on auth pages */}
      {isAuthenticated && !hideNavbar && <Navbar />}

      <div className="content">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Private routes - use isAuthenticated instead of just token */}
          <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />
          <Route path="/event/:id" element={isAuthenticated ? <EventDetails /> : <Navigate to="/login" />} />
          <Route path="/rsvps" element={isAuthenticated ? <RSVPs /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/profile/:id" element={isAuthenticated ? <ProfileView /> : <Navigate to="/login" />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}
