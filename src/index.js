import { createRoot } from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

// 🎯 FIXED: Removed StrictMode to prevent overlapping camera overlays on iOS Safari
root.render(<App />);
