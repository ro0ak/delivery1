import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";
import App from "./app/App";
import { AuthProvider } from "./app/contexts/AuthContext";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          richColors
          closeButton
          dir="rtl"
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
