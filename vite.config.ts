import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "./src/main.tsx",
      name: "Counter",
      fileName: "counter",
    },
  },
});
