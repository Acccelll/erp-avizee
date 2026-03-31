import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { RelationalNavigationProvider } from "./contexts/RelationalNavigationContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <RelationalNavigationProvider>
    <App />
  </RelationalNavigationProvider>
);
