import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite config — supports .js files with JSX, "@/" alias, REACT_APP_* env vars
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const processEnv = Object.fromEntries(
        Object.entries(env)
            .filter(([k]) => k.startsWith("REACT_APP_") || k === "PUBLIC_URL")
            .map(([k, v]) => [k, v]),
    );

    return {
        plugins: [
            react({
                // Allow JSX inside plain .js files (we don't use .jsx everywhere)
                include: "**/*.{js,jsx,ts,tsx}",
            }),
        ],
        resolve: {
            alias: { "@": path.resolve(__dirname, "src") },
        },
        define: {
            // Emulate process.env.REACT_APP_* for CRA-style code
            "process.env": JSON.stringify(processEnv),
        },
        server: { port: 3000, host: "0.0.0.0", strictPort: false, allowedHosts: true },
        preview: { port: 3000, host: "0.0.0.0", allowedHosts: true },
        build: {
            outDir: "build",
            sourcemap: false,
            chunkSizeWarningLimit: 1500,
        },
        esbuild: {
            loader: "jsx",
            include: /src\/.*\.(js|jsx)$/,
            exclude: [],
        },
        optimizeDeps: {
            esbuildOptions: { loader: { ".js": "jsx" } },
        },
    };
});
