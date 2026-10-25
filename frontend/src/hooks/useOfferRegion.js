import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Detects whether the visitor is in India (INR pricing) or outside (USD pricing).
// Defaults to India (the primary market) until geo resolves or if it fails.
export function useOfferRegion() {
  const [inIndia, setInIndia] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    api.get("/geo")
      .then(({ data }) => {
        if (!active) return;
        const cc = (data?.country_code || "").toUpperCase();
        if (cc) setInIndia(cc === "IN");
        setReady(true);
      })
      .catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  return { inIndia, ready };
}
