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
  const [profileUpdateInProgress, setProfileUpdateInProgress] = useState(false);
  const [lastEmailValidation, setLastEmailValidation] = useState(null);

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

  // Validate Vanderbilt email domain with update context awareness
  const isValidVanderbiltUser = (user) => {
    // Check environment variable to enable/disable email restriction
    const enforceVanderbiltEmail = process.env.REACT_APP_ENFORCE_VANDERBILT_EMAIL === 'true';
    if (!enforceVanderbiltEmail) {
      console.log('📧 Vanderbilt email restriction disabled for testing');
      return true;
    }
    
    // Skip validation if profile update is in progress to prevent logout
    if (profileUpdateInProgress) {
      console.log('📧 Skipping email validation during profile update');
      return true;
    }
    
    // Add debouncing for email validation to prevent rapid re-checks
    const currentEmail = user?.email;
    if (lastEmailValidation === currentEmail) {
      return true; // Already validated this email recently
    }
    
    // AUTO-APPROVE: All vanderbilt.edu emails are automatically valid (no verification needed)
    const isVanderbiltEmail = user?.email?.endsWith('@vanderbilt.edu');
    if (isVanderbiltEmail) {
      console.log('✅ Auto-approved Vanderbilt email:', user.email);
      setLastEmailValidation(currentEmail);
      return true;
    }
    
    // For non-Vanderbilt emails, still require validation
    console.log('❌ Non-Vanderbilt email detected:', user.email);
    return false;
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
            detailedResponse: true,
            scope: "openid profile email",
            timeoutInSeconds: 10 // Add timeout to prevent hanging
          });
          console.log('✅ Got Auth0 token:', {
            hasToken: !!accessToken?.access_token,
            tokenLength: accessToken?.access_token?.length,
            scope: accessToken?.scope
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
          
          // Categorize errors - don't logout for temporary issues
          const isTemporaryError = error.message?.includes('timeout') || 
                                  error.message?.includes('network') ||
                                  error.message?.includes('rate limit');
          
          if (isTemporaryError) {
            console.log('🔄 Temporary token error, keeping user logged in');
            // Keep existing token and user state for temporary issues
          } else {
            console.log('💥 Permanent token error, clearing state');
            setTokenState(null);
            // Don't clear user state immediately - let them retry
          }
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
    setProfileUpdateInProgress(false);
    setLastEmailValidation(null);
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

  // Helper functions for profile update context
  const markProfileUpdateStart = () => {
    console.log('📝 Profile update started - preventing logout');
    setProfileUpdateInProgress(true);
  };

  const markProfileUpdateEnd = () => {
    console.log('📝 Profile update completed');
    setProfileUpdateInProgress(false);
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      setToken: setTokenState, 
      setUser: setUserState, 
      logout,
      login,
      markProfileUpdateStart,
      markProfileUpdateEnd,
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
