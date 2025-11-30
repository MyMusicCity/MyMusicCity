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

// Validate Auth0 configuration
if (!domain || !clientId) {
  console.error("Auth0 configuration missing. Please check your .env file.");
  console.error("Required environment variables:");
  console.error("- REACT_APP_AUTH0_DOMAIN");
  console.error("- REACT_APP_AUTH0_CLIENT_ID");
}

// Find the <div id="root"></div> in public/index.html
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render the app inside it
root.render(
  <BrowserRouter>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: `https://${domain}/api/v2/`,
        scope: "openid profile email"
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </Auth0Provider>
  </BrowserRouter>
);
