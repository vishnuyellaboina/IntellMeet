import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";
import "./IntellMeet_LightTheme.css";
import "./styles/responsive.css";

const savedSettings = (() => {
  try {
    return JSON.parse(
      localStorage.getItem("intellmeet_settings") || "null"
    );
  } catch {
    return null;
  }
})();

const theme =
  savedSettings?.appearance?.theme || "dark";

document.documentElement.setAttribute(
  "data-theme",
  theme
);

document.documentElement.classList.toggle(
  "light-theme",
  theme === "light"
);
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);