import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";
import App from "./App";
import { IS_PREVIEW } from "@/lib/env";
import { useApp } from "@/store/app";
import { startMonitoring } from "@/lib/monitor";
import { inject } from "@vercel/analytics";
import { captureFirstTouch } from "@/lib/attribution";

startMonitoring();
captureFirstTouch();
// Privacy-friendly visit counts (no cookies): shows where visitors come from, e.g. Facebook groups.
if (!IS_PREVIEW && import.meta.env.PROD) inject();

// When a new version is deployed, the new service worker takes over; reload once
// so people never keep using an old copy of the app.
if ("serviceWorker" in navigator && !IS_PREVIEW) {
  let reloaded = false;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
  // Check for a new version whenever the app comes back to the foreground.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined);
  });
}

// The preview opens on a worked example so every screen shows real content.
if (IS_PREVIEW && !useApp.getState().onboarded) useApp.getState().loadSample();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
