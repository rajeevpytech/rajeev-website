import React from "react";
import { motion } from "framer-motion";

// Splits `text` into lines by \n and animates each line masked from bottom.
export const MaskedLines = ({ lines, className = "", delay = 0, stagger = 0.12, as = "span" }) => {
    const items = Array.isArray(lines) ? lines : String(lines).split("\n");
    const Tag = motion[as] || motion.span;
    return (
        <span className={className}>
            {items.map((line, i) => (
                <span key={i} className="mask-line">
                    <Tag
                        style={{ display: "inline-block", willChange: "transform" }}
                        initial={{ y: "110%" }}
                        animate={{ y: "0%" }}
                        transition={{ duration: 1.1, delay: delay + i * stagger, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {line}
                    </Tag>
                </span>
            ))}
        </span>
    );
};

export const RevealUp = ({ children, delay = 0, y = 30, className = "" }) => (
    <motion.div
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        className={className}
    >
        {children}
    </motion.div>
);
