import { defineConfig } from "vite";
import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",

    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) {
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
    },
  };
}

function copyHtaccess() {
  return {
    name: "copy-htaccess",

    closeBundle() {
      const sourcePath = path.resolve(
        __dirname,
        ".htaccess",
      );

      const destinationPath = path.resolve(
        __dirname,
        "dist/.htaccess",
      );

      if (!fs.existsSync(sourcePath)) {
        console.warn(
          ".htaccess was not found in the project root.",
        );

        return;
      }

      fs.copyFileSync(
        sourcePath,
        destinationPath,
      );
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    copyHtaccess(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  assetsInclude: [
    "**/*.svg",
    "**/*.csv",
  ],
});
