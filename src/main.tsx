import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AccountProvider } from "./platform/auth/AccountProvider";
import { redirectToCanonicalHost } from "./platform/navigation/canonicalHost";
import "./styles/global.css";

if (!redirectToCanonicalHost()) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AccountProvider>
        <App />
      </AccountProvider>
    </StrictMode>
  );
}
