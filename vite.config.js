import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El navegador habla con http://localhost:5173/api/... y Vite reenvía esas
// peticiones al backend (puerto 8000). Así la cookie de sesión es del mismo
// origen y no hay problemas de CORS en desarrollo.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000" },
    },
  },
});
