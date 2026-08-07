import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { PreselectProvider } from "./context/PreselectContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PreselectProvider>
        <App />
      </PreselectProvider>
    </BrowserRouter>
  </StrictMode>
);
