// client/src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, signupUser } from "../api";
import "../styles.css";
import { AuthContext } from "../AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const { setToken } = useContext(AuthContext);
  const { setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isSignup
        ? await signupUser(form.username, form.email, form.password)
        : await loginUser(form.email, form.password);

      // ✅ Store token and user info
      if (res?.token) {
        // persist
        localStorage.setItem("token", res.token);
        setToken(res.token); // update context so App re-renders
      }
      if (res?.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        setUser(res.user);
      }

      // ✅ Redirect to home page after success
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login/signup error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>{isSignup ? "Create Account" : "Log In"}</h2>
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
            />
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
          <button type="submit" disabled={loading}>{loading ? (isSignup ? "Signing up..." : "Logging in...") : (isSignup ? "Sign Up" : "Log In")}</button>
        </form>
        <p>
          {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <span
            className="toggle-link"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Log in" : "Sign up"}
          </span>
        </p>
      </div>
    </div>
  );
}
