import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { Toaster } from "sonner";

import App from "./app/App";
import { AuthProvider } from "./app/contexts/AuthContext";

import "./styles/index.css";
import "./styles/role-pages.css";

// إلغاء أي Service Worker قديم عند العملاء
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      })
      .catch((error) => {
        console.error(
          "Failed to unregister service workers:",
          error,
        );
      });
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />

        <Toaster
          position="top-center"
          richColors
          closeButton
          dir="rtl"
        />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
