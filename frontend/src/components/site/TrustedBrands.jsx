import React from "react";
import Marquee from "react-fast-marquee";
import { RevealUp } from "@/components/motion/Reveal";

const brands = [
    "Nexus Boutique",
    "EduCorp",
    "Vertex Realty",
    "Sunset Bistro",
    "MediCare+",
    "Apex Legal",
    "LearnSphere",
    "OrbitFinance",
    "Northwind Labs",
    "Meridian Retail",
];

export default function TrustedBrands() {
    return (
        <section className="relative py-16 md:py-20 border-y border-acid/10 bg-ink" data-testid="trusted-brands">
            <div className="max-w-[1440px] mx-auto px-5 md:px-10">
                <RevealUp>
                    <p className="text-center eyebrow mb-8">Trusted across industries</p>
                </RevealUp>
                <Marquee gradient gradientColor="#0A0806" gradientWidth={120} speed={35} pauseOnHover>
                    {brands.map((b) => (
                        <span key={b} className="inline-flex items-center px-8 md:px-14 font-serif italic text-ash/70 text-3xl md:text-4xl lg:text-5xl hover:text-acid transition-colors duration-500">
                            {b}
                        </span>
                    ))}
                </Marquee>
            </div>
        </section>
    );
}
