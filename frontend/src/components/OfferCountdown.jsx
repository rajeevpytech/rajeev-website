import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const KEY = "rf_offer_deadline";
const WINDOW_MS = 24 * 60 * 60 * 1000; // rolling 24h urgency window per visitor

function getDeadline(endTs) {
  // If a scheduled end date is set and still in the future, count down to it.
  if (endTs && endTs > Date.now()) return endTs;
  try {
    let d = parseInt(localStorage.getItem(KEY) || "0", 10);
    if (!d || d < Date.now()) {
      d = Date.now() + WINDOW_MS;
      localStorage.setItem(KEY, String(d));
    }
    return d;
  } catch {
    return Date.now() + WINDOW_MS;
  }
}

export default function OfferCountdown({ className = "", light = false, endTs = null }) {
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setDeadline(getDeadline(endTs));
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endTs]);
  if (!deadline) return null;
  const rem = Math.max(0, deadline - now);
  const days = Math.floor(rem / 86400000);
  const h = String(Math.floor((rem % 86400000) / 3600000)).padStart(2, "0");
  const m = String(Math.floor((rem % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((rem % 60000) / 1000)).padStart(2, "0");
  return (
    <span
      data-testid="offer-countdown"
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-xs md:text-sm ${light ? "bg-white/15 text-white" : "bg-brand/10 text-brand"} ${className}`}
    >
      <Clock className="h-3.5 w-3.5" /> Offer ends in{" "}
      <b className="tabular-nums tracking-wider">{days > 0 ? `${days}d ` : ""}{h}:{m}:{s}</b>
    </span>
  );
}
