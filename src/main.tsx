import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { PreselectProvider } from "./context/PreselectContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PreselectProvider>
          <App />
        </PreselectProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
