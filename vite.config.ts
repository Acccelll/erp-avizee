import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const FALLBACK_SUPABASE_URL = "https://vhwhxvsfkossbrfbeawa.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2h4dnNma29zc2JyZmJlYXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjU1NjcsImV4cCI6MjA4ODg0MTU2N30.ks5n6-eNNNYJXJp4o7y3hYXRmOsyU9L_jdlOy5iKkMU";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? FALLBACK_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabasePublishableKey),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@radix-ui/react-select",
        "@radix-ui/react-popover",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-tooltip",
        "@radix-ui/react-context",
        "@radix-ui/react-primitive",
        "@radix-ui/react-slot",
      ],
    },
  };
});