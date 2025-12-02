import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import { AuthProvider } from "./AuthContext";
import "./styles.css"; // optional if you have this file

// Auth0 configuration
const domain = process.env.REACT_APP_AUTH0_DOMAIN;
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
const connection = process.env.REACT_APP_AUTH0_CONNECTION || "Username-Password-Authentication";

// Debug Auth0 configuration
console.log('🔧 Auth0 Configuration Check:');
console.log('- Domain:', domain || 'NOT SET');
console.log('- Client ID:', clientId || 'NOT SET');
console.log('- Audience:', audience || 'NOT SET');
console.log('- Connection:', connection);
console.log('- Skip Email Verification:', process.env.REACT_APP_AUTH0_SKIP_EMAIL_VERIFICATION);

// Validate Auth0 configuration
if (!domain || !clientId || domain.includes('your-auth0-domain') || clientId.includes('your-auth0-client-id')) {
  if (process.env.NODE_ENV === 'development') {
    console.error("❌ Auth0 configuration missing or using placeholder values!");
    console.error("Required environment variables:");
    console.error("- REACT_APP_AUTH0_DOMAIN (currently:", domain, ")");
    console.error("- REACT_APP_AUTH0_CLIENT_ID (currently:", clientId, ")");
    console.error("\n📝 To fix this:");
    console.error("1. Create real Auth0 application at https://manage.auth0.com");
    console.error("2. Update environment variables in Vercel dashboard");
  }
}

// Find the <div id="root"></div> in public/index.html
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render the app inside it
root.render(
  <BrowserRouter>
    {(!domain || !clientId || domain.includes('your-auth0-domain') || clientId.includes('your-auth0-client-id')) ? (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <h1>⚙️ Configuration Required</h1>
        <p>Auth0 environment variables need to be configured.</p>
        <p>Check the browser console for details.</p>
        <div style={{ background: '#f0f0f0', padding: '1rem', margin: '1rem 0', borderRadius: '8px' }}>
          <p><strong>Current values:</strong></p>
          <p>Domain: {domain || 'Not set'}</p>
          <p>Client ID: {clientId || 'Not set'}</p>
        </div>
        <p>Configure these in your Vercel dashboard under Environment Variables.</p>
      </div>
    ) : (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          ...(audience && { audience: audience }),
          scope: "openid profile email",
          // FORCE BYPASS EMAIL VERIFICATION
          connection: connection,
          mode: "signUp"
        }}
        skipRedirectCallback={false}
        cacheLocation="localstorage"
        useRefreshTokens={true}
        onRedirectCallback={(appState) => {
          console.log('🔐 Auth0 redirect callback:', appState);
        }}
      >
        <AuthProvider>
          <App />
        </AuthProvider>
      </Auth0Provider>
    )}
  </BrowserRouter>
);
