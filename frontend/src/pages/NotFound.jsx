import Link from "@/components/CanonicalLink";

import Seo from "@/components/Seo";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center">
      <Seo title="Page not found | Rajeev Freelancer" description="The page you're looking for doesn't exist." path="/404" noindex />
      <div className="mx-auto max-w-[1400px] w-full px-5 md:px-10">
        <p className="font-mono text-sm text-brand">404</p>
        <h1 className="mt-4 font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-7xl leading-[0.9]">Nothing here.</h1>
        <p className="mt-6 max-w-md text-ink/70">This page doesn't exist or hasn't been generated. Let's get you back on track.</p>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-white hover:bg-brand transition-colors"><ArrowLeft className="h-4 w-4" /> Back home</Link>
      </div>
    </div>
  );
}
