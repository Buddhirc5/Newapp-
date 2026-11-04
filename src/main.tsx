import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";
import App from "./App";
import { IS_PREVIEW } from "@/lib/env";
import { useApp } from "@/store/app";

// The preview opens on a worked example so every screen shows real content.
if (IS_PREVIEW && !useApp.getState().onboarded) useApp.getState().loadSample();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
