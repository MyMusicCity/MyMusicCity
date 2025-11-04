import React, { createContext, useState, useEffect } from "react";

// Simple auth context that keeps token in React state and mirrors it to localStorage
export const AuthContext = createContext({ token: null, setToken: () => {} });

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("token"));

  // helper to update both state and localStorage
  const setToken = (t) => {
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
    setTokenState(t);
  };

  // keep state in sync if some other tab updates localStorage (optional)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") setTokenState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
