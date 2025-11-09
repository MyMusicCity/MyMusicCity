import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, signupUser } from "../api";
import "../styles.css";
import { AuthContext } from "../AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    year: "",
    major: "",
  });
  const [error, setError] = useState("");
  const { setToken, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isSignup
        ? await signupUser(form.username, form.email, form.password, form.year, form.major)
        : await loginUser(form.email, form.password);

      if (res?.token) {
        localStorage.setItem("token", res.token);
        setToken(res.token);
      }
      if (res?.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        setUser(res.user);
      }

      navigate("/", { replace: true });
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
