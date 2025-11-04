import React, { createContext, useState, useEffect } from "react";

// Simple auth context that keeps token in React state and mirrors it to localStorage
export const AuthContext = createContext({
  token: null,
  user: null,
  setToken: () => {},
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("token"));
  const [user, setUserState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch (e) {
      return null;
    }
  });

  // helper to update both state and localStorage for token
  const setToken = (t) => {
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
    setTokenState(t);
  };

  // helper to update both state and localStorage for user
  const setUser = (u) => {
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
    setUserState(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // keep state in sync if some other tab updates localStorage (optional)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") setTokenState(e.newValue);
      if (e.key === "user") {
        try {
          setUserState(JSON.parse(e.newValue));
        } catch (err) {
          setUserState(null);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, setToken, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
