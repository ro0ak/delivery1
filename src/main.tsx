import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { Toaster } from "sonner";

import App from "./app/App";
import { AuthProvider } from "./app/contexts/AuthContext";

// حمّل ملفات التنسيق مرة واحدة فقط وبالترتيب الصحيح.
import "./styles/role-pages.css";
import "./styles/index.css";

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
