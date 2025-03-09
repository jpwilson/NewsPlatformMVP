import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Add debugging
console.log("Environment:", import.meta.env);
console.log("Base URL:", import.meta.env.BASE_URL);

// Simple API connectivity check
fetch("/api/user")
  .then((res) => {
    console.log("API /user status:", res.status);
    return res.json().catch(() => ({ status: "error parsing response" }));
  })
  .then((data) => console.log("API /user response:", data))
  .catch((err) => console.error("API /user error:", err));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
