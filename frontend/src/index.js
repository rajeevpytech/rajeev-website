import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import "@/index.css";
import App from "@/App";
import { setSiteConfig } from "@/lib/siteConfig";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

function Notifications() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  return mounted ? <Toaster position="top-center" richColors /> : null;
}

const element = document.getElementById("root");
const payload = globalThis.__RF_BOOTSTRAP__;
if (payload?.settings) setSiteConfig(payload.settings);
const app = (
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <App />
          </SettingsProvider>
          <Notifications />
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
if (payload?.renderedBy === "react" && element.hasChildNodes()) ReactDOM.hydrateRoot(element, app);
else ReactDOM.createRoot(element).render(app);
