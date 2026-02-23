import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function applyTheme(config: { mode?: string; accent_override?: string; border_radius?: string; animations?: boolean }) {
  const root = document.documentElement;

  if (config.mode === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else if (config.mode === "light") {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }

  if (config.accent_override) {
    root.style.setProperty("--accent", config.accent_override);
  }

  if (config.border_radius === "sharp") {
    root.style.setProperty("--radius", "0.375rem");
  }

  if (config.animations === false) {
    root.style.setProperty("--ios-spring", "linear");
    root.style.setProperty("--ios-bounce", "linear");
  }
}

const cached = localStorage.getItem("shelf-theme");
if (cached) {
  try { applyTheme(JSON.parse(cached)); } catch {}
}

fetch("/api/platform/theme")
  .then((r) => r.ok ? r.json() : null)
  .then((config) => {
    if (config) {
      localStorage.setItem("shelf-theme", JSON.stringify(config));
      applyTheme(config);
    }
  })
  .catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
