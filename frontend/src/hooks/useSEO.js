import { useEffect } from "react";

// Simple SEO hook — sets document title + meta description + canonical
export default function useSEO({ title, description, path }) {
    useEffect(() => {
        if (title) document.title = title;
        if (description) {
            let m = document.querySelector('meta[name="description"]');
            if (!m) {
                m = document.createElement("meta");
                m.setAttribute("name", "description");
                document.head.appendChild(m);
            }
            m.setAttribute("content", description);
        }
        if (path) {
            let c = document.querySelector('link[rel="canonical"]');
            if (!c) {
                c = document.createElement("link");
                c.setAttribute("rel", "canonical");
                document.head.appendChild(c);
            }
            c.setAttribute("href", `${window.location.origin}${path}`);
        }
        window.scrollTo({ top: 0, behavior: "instant" });
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    }, [title, description, path]);
}
