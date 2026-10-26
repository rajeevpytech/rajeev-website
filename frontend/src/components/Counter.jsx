import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";

export default function Counter({ value, suffix = "", decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const mv = useMotionValue(0);
  const textRef = useRef(null);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
    const unsub = mv.on("change", (v) => {
      if (textRef.current) textRef.current.textContent = v.toFixed(decimals);
    });
    return () => { controls.stop(); unsub(); };
  }, [inView, value, decimals, mv]);

  return (
    <span ref={ref} className="tabular-nums">
      <span ref={textRef}>{Number(value).toFixed(decimals)}</span>{suffix}
    </span>
  );
}
