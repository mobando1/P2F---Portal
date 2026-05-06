import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import App from "./App";
import "./index.css";

// Fire and forget — initSentry resolves the DSN at runtime if Vite didn't
// inline it at build time. The app should not block on it.
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
