import {
  defineConfig,
  type Plugin,
} from "vite";

import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function figmaAssetResolver(): Plugin {
  return {
    name: "figma-asset-resolver",

    resolveId(id: string) {
      if (
        id.startsWith(
          "figma:asset/",
        )
      ) {
        const filename = id.replace(
          "figma:asset/",
          "",
        );

        return path.resolve(
          __dirname,
          "src/assets",
          filename,
        );
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(
        __dirname,
        "./src",
      ),
    },
  },

  assetsInclude: [
    "**/*.svg",
    "**/*.csv",
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("@supabase")) {
            return "supabase";
          }

          if (
            id.includes("@radix-ui") ||
            id.includes("lucide-react") ||
            id.includes("recharts")
          ) {
            return "ui-vendor";
          }

          return "vendor";
        },
      },
    },
  },
});
