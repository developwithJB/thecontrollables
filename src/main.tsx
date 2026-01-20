import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initInstallPromptListener, registerServiceWorker } from "./lib/pwa";
import { setupGlobalErrorTracking } from "./hooks/useAnalytics";

// Initialize PWA functionality
initInstallPromptListener();
registerServiceWorker();

// Initialize global error tracking for uncaught errors
setupGlobalErrorTracking();

createRoot(document.getElementById("root")!).render(<App />);
