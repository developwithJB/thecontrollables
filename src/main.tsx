import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initInstallPromptListener, registerServiceWorker } from "./lib/pwa";

// Initialize PWA functionality
initInstallPromptListener();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
