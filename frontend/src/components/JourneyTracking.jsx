import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "@/context/SettingsContext";
import { getSiteConfig } from "@/lib/siteConfig";
import { emitPageView, installJourneyClicks } from "@/lib/journeyTracking";

export default function JourneyTracking() {
  const { pathname } = useLocation();
  const settings = useSiteSettings();
  useEffect(() => { emitPageView(getSiteConfig(), pathname); }, [pathname, settings]);
  useEffect(() => installJourneyClicks(getSiteConfig), []);
  return null;
}
