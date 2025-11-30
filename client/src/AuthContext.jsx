import React, { createContext, useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { setAuth0TokenProvider } from './api';

// Enhanced auth context that bridges Auth0 with existing interface
export const AuthContext = createContext({
  token: null,
  user: null,
  setToken: () => {},
  setUser: () => {},
  logout: () => {},
  isLoading: false,
  isAuthenticated: false,
});

export function AuthProvider({ children }) {
  const { 
    user: auth0User, 
    isAuthenticated: auth0IsAuthenticated, 
    isLoading: auth0IsLoading,
    getAccessTokenSilently,
    logout: auth0Logout,
    loginWithRedirect
  } = useAuth0();

  const [token, setTokenState] = useState(null);
  const [user, setUserState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up the token provider for API calls
  useEffect(() => {
    setAuth0TokenProvider(getAccessTokenSilently);
  }, [getAccessTokenSilently]);

  // Validate Vanderbilt email domain
  const isValidVanderbiltUser = (user) => {
    // Temporarily disable email restriction for testing
    return true;
    // return user?.email?.endsWith('@vanderbilt.edu');
  };

  // Get token from Auth0
  useEffect(() => {
    const getToken = async () => {
      if (auth0IsAuthenticated && auth0User) {
        if (!isValidVanderbiltUser(auth0User)) {
          console.error('Access restricted to Vanderbilt email addresses');
          auth0Logout({ returnTo: window.location.origin });
          return;
        }
        
        try {
          const accessToken = await getAccessTokenSilently();
          setTokenState(accessToken);
          setUserState({
            id: auth0User.sub,
            username: auth0User.nickname || auth0User.name,
            email: auth0User.email,
            name: auth0User.name,
            picture: auth0User.picture
          });
        } catch (error) {
          console.error('Error getting access token:', error);
        }
      } else {
        setTokenState(null);
        setUserState(null);
      }
      setIsLoading(auth0IsLoading);
    };

    getToken();
  }, [auth0IsAuthenticated, auth0User, auth0IsLoading, getAccessTokenSilently, auth0Logout]);

  // Helper functions for backward compatibility
  const setToken = (t) => {
    setTokenState(t);
  };

  const setUser = (u) => {
    setUserState(u);
  };

  const logout = () => {
    auth0Logout({ returnTo: window.location.origin });
    setTokenState(null);
    setUserState(null);
  };

  const login = () => {
    loginWithRedirect();
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      setToken, 
      setUser, 
      logout,
      login,
      isLoading,
      isAuthenticated: auth0IsAuthenticated && isValidVanderbiltUser(auth0User)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
