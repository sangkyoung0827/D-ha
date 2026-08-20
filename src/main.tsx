import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AccountProvider } from "./platform/auth/AccountProvider";
import { redirectToCanonicalHost } from "./platform/navigation/canonicalHost";
import { PwaExperience } from "./components/pwa/PwaExperience";
import "./styles/global.css";

if (!redirectToCanonicalHost()) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AccountProvider>
        <App />
        <PwaExperience />
      </AccountProvider>
    </StrictMode>
  );
}
