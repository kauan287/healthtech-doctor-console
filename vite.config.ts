import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command, mode }) => {
  if (command === "build" && mode === "production" && !loadEnv(mode, process.cwd()).VITE_API_URL) {
    throw new Error("Set VITE_API_URL to the orchestrator's URL before a production build.");
  }
  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["src/test/setup.ts"],
    },
  };
});
