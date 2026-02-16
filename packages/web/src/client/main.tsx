import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./globals.css";

// Performance monitoring with Web Vitals
if (import.meta.env.DEV) {
  import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
    function sendToAnalytics(metric: any) {
      const { name, value, rating } = metric;
      console.log(`[Web Vitals] ${name}:`, {
        value: Math.round(value),
        rating,
        target:
          name === "LCP"
            ? "< 2500ms"
            : name === "INP"
              ? "< 200ms"
              : name === "CLS"
                ? "< 0.1"
                : name === "FCP"
                  ? "< 1800ms"
                  : "< 600ms",
      });
    }

    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
