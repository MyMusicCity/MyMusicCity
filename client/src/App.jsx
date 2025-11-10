import React, { useContext } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import EventDetails from "./pages/EventDetails";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import ProfileView from "./pages/ProfileView";
import RSVPs from "./pages/RSVPs";
import Login from "./pages/Login"; 
import { AuthContext } from "./AuthContext";

export default function App() {
  const { token } = useContext(AuthContext);
  const location = useLocation();

  // Hide navbar on login or signup pages
  const hideNavbar = ["/login", "/signup"].includes(location.pathname);

  return (
    <div className="app">
      {/* Only show navbar if logged in AND not on login/signup */}
      {token && !hideNavbar && <Navbar />}

      <div className="content">
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Private routes */}
          <Route path="/" element={token ? <Home /> : <Navigate to="/login" />} />
          <Route path="/event/:id" element={token ? <EventDetails /> : <Navigate to="/login" />} />
          <Route path="/messages" element={token ? <Messages /> : <Navigate to="/login" />} />
          <Route path="/rsvps" element={token ? <RSVPs /> : <Navigate to="/login" />} />
          <Route path="/profile" element={token ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/profile/:id" element={token ? <ProfileView /> : <Navigate to="/login" />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}
