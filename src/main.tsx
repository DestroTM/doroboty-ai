import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PostHogErrorBoundary } from "@posthog/react";
import { App } from "./features/prototype/app";
import { initPosthog } from "./lib/posthog";
import "./app/globals.css";

initPosthog();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogErrorBoundary>
      <App />
    </PostHogErrorBoundary>
  </StrictMode>,
);
