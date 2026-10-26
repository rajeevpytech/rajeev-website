import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CURRENCIES, COUNTRY_CURRENCY, ISO_CURRENCY } from "@/data/site";

const USD_TIERS = [[1000, 3000], [3000, 10000], [10000, 25000], [25000, null]];
const FALLBACK = { INR: 90, GBP: 0.79, EUR: 0.92, AED: 3.67, SGD: 1.35, AUD: 1.52, CAD: 1.36, USD: 1 };

function fmt(currency, amount) {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: amount >= 1000 ? 1 : 0 }).format(amount);
  } catch {
    return `${Math.round(amount)}`;
  }
}

// Detect visitor currency (or use the page's country) + live FX rates.
// Prices are anchored in INR and converted to the visitor's currency.
export function useCurrency(countrySlug = "") {
  const [currency, setCurrency] = useState(null);
  const [rate, setRate] = useState(1);          // USD -> currency
  const [rateInr, setRateInr] = useState(FALLBACK.INR); // USD -> INR
  const [detected, setDetected] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      let cur = (countrySlug && COUNTRY_CURRENCY[countrySlug]) || null;
      let country = "";
      if (!cur) {
        try {
          const { data } = await api.get("/geo");
          if (data.currency && CURRENCIES[data.currency]) cur = data.currency;
          else if (data.country_code && ISO_CURRENCY[data.country_code]) cur = ISO_CURRENCY[data.country_code];
          country = data.country_name || "";
        } catch { /* ignore */ }
      }
      cur = cur || "USD";
      let r = 1, rInr = FALLBACK.INR;
      try {
        const { data } = await api.get("/rates");
        const rates = data?.rates || {};
        rInr = rates.INR || FALLBACK.INR;
        if (cur !== "USD") r = rates[cur] || FALLBACK[cur] || 1;
      } catch {
        if (cur !== "USD") r = FALLBACK[cur] || 1;
      }
      if (active) { setCurrency(cur); setRate(r); setRateInr(rInr); setDetected(country); }
    })();
    return () => { active = false; };
  }, [countrySlug]);

  const active = currency || "USD";
  const budgets = currency
    ? USD_TIERS.map(([lo, hi]) => (hi ? `${fmt(active, lo * rate)} – ${fmt(active, hi * rate)}` : `${fmt(active, lo * rate)}+`))
    : CURRENCIES.USD.budgets;

  // base amount is in INR; convert to the active currency via USD
  const price = (inr) => fmt(active, (inr / rateInr) * rate);

  return { currency: active, rate, detected, budgets, price, ready: currency !== null };
}
