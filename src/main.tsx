import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initInstallPromptListener, registerServiceWorker } from "./lib/pwa";
import { initTelemetry } from "./lib/telemetry";

// Initialize PWA functionality
initInstallPromptListener();
registerServiceWorker();

// Initialize analytics and error monitoring
initTelemetry();

createRoot(document.getElementById("root")!).render(<App />);
