import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css"; // optional if you have this file

// Find the <div id="root"></div> in public/index.html
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render the app inside it
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
