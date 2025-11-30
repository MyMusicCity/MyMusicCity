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
    loginWithRedirect,
    error: auth0Error
  } = useAuth0();

  const [token, setTokenState] = useState(null);
  const [user, setUserState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if Auth0 is properly configured
  const isAuth0Configured = !!(
    process.env.REACT_APP_AUTH0_DOMAIN && 
    process.env.REACT_APP_AUTH0_CLIENT_ID && 
    !process.env.REACT_APP_AUTH0_DOMAIN.includes('your-auth0-domain')
  );

  console.log('🔧 AuthProvider state:', {
    isAuth0Configured,
    auth0IsAuthenticated,
    auth0Error: auth0Error?.message,
    hasAuth0User: !!auth0User
  });

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
      console.log('🔐 AuthContext: Auth0 state check:', {
        isAuthenticated: auth0IsAuthenticated,
        hasUser: !!auth0User,
        loading: auth0IsLoading
      });
      
      if (auth0IsAuthenticated && auth0User) {
        if (!isValidVanderbiltUser(auth0User)) {
          console.log('❌ Invalid Vanderbilt user, signing out');
          // Redirect unauthorized users
          auth0Logout({ returnTo: window.location.origin });
          return;
        }
        
        try {
          console.log('🎫 Attempting to get Auth0 access token...');
          const accessToken = await getAccessTokenSilently({
            detailedResponse: true
          });
          console.log('✅ Got Auth0 token:', {
            hasToken: !!accessToken?.access_token,
            tokenLength: accessToken?.access_token?.length
          });
          
          setTokenState(accessToken.access_token);
          setUserState({
            id: auth0User.sub,
            username: auth0User.nickname || auth0User.name,
            email: auth0User.email,
            name: auth0User.name,
            picture: auth0User.picture,
            auth0Id: auth0User.sub
          });
        } catch (error) {
          console.error('❌ Failed to get Auth0 access token:', error);
          console.error('Token error details:', {
            name: error.name,
            message: error.message,
            error_description: error.error_description
          });
          // Clear token state but keep user info for display
          setTokenState(null);
        }
      } else {
        console.log('🔄 Auth0 not authenticated, checking localStorage...');
        // Check for localStorage token as fallback
        const localToken = localStorage.getItem('token');
        const localUser = localStorage.getItem('user');
        
        if (localToken && localUser) {
          try {
            const userData = JSON.parse(localUser);
            console.log('✅ Found localStorage auth, using as fallback');
            setTokenState(localToken);
            setUserState(userData);
          } catch (e) {
            console.log('❌ Invalid localStorage user data');
            setTokenState(null);
            setUserState(null);
          }
        } else {
          setTokenState(null);
          setUserState(null);
        }
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
    if (isAuth0Configured && !auth0Error) {
      console.log('🔐 Using Auth0 login');
      loginWithRedirect();
    } else {
      console.log('⚠️ Auth0 unavailable, redirecting to legacy login');
      // Fallback to legacy login page
      window.location.href = '/login-legacy';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      setToken: setTokenState, 
      setUser: setUserState, 
      logout,
      login,
      isLoading,
      isAuthenticated: (auth0IsAuthenticated && isValidVanderbiltUser(auth0User)) || (!!user && !!token),
      auth0Error: auth0Error?.message,
      isAuth0Configured
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
