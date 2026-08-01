import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initInstallPromptListener, registerServiceWorker } from "./lib/pwa";

// Initialize PWA functionality
initInstallPromptListener();
registerServiceWorker();

// Keep analytics and error monitoring in separate chunks without losing early
// events. Callers wait on this shared promise while React can paint immediately.
window.__TELEMETRY_READY__ = import("./lib/telemetry")
  .then(({ initTelemetry }) => initTelemetry())
  .catch(() => undefined);

createRoot(document.getElementById("root")!).render(<App />);
