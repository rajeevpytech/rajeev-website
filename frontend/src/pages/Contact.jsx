import Seo from "@/components/Seo";
import { MaskLines } from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { CONTACT, waLink, googleProfileUrl } from "@/data/site";
import { MessageCircle, Mail, Clock, Star } from "lucide-react";

export default function Contact() {
  return (
    <div>
      <Seo
        title="Contact & Book a Free Consultation | Rajeev Freelancer"
        description="Book a free consultation with Rajeev — senior freelance engineer & AI/digital marketing consultant. WhatsApp, email or the form. Average response under 30 minutes."
        path="/contact"
      />
      <section className="mx-auto max-w-[1400px] px-5 md:px-10 pt-32 md:pt-40 pb-20 grid lg:grid-cols-2 gap-14 items-start">
        <div>
          <p className="overline">/ Contact</p>
          <h1 className="mt-6 font-heading font-extrabold tracking-tighter text-5xl sm:text-6xl lg:text-[4.4rem] leading-[0.9]">
            <MaskLines lines={["Let's build", "something", "worth talking", "about."]} />
          </h1>
          <p className="mt-8 max-w-md text-lg text-ink/70 leading-relaxed">Tell me about your project and get a clear, fixed-scope proposal. No account managers — you deal with Rajeev directly.</p>

          <div className="mt-10 space-y-4">
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-ink transition-colors">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]"><MessageCircle className="h-5 w-5" /></span>
              <span><span className="block font-semibold">WhatsApp</span><span className="text-sm text-muted-foreground">{CONTACT.whatsappDisplay}</span></span>
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-ink transition-colors">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Mail className="h-5 w-5" /></span>
              <span><span className="block font-semibold">Email</span><span className="text-sm text-muted-foreground break-all">{CONTACT.email}</span></span>
            </a>
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-coral/10 text-coral"><Clock className="h-5 w-5" /></span>
              <span><span className="block font-semibold">Response time</span><span className="text-sm text-muted-foreground">Usually under 30 minutes</span></span>
            </div>
            <a href={googleProfileUrl()} target="_blank" rel="noopener noreferrer" data-testid="contact-google-profile" className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-ink transition-colors">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#4285F4]/10 text-[#4285F4]"><Star className="h-5 w-5 fill-[#FBBC05] text-[#FBBC05]" /></span>
              <span><span className="block font-semibold">Find us on Google</span><span className="text-sm text-muted-foreground">View our Google Business profile &amp; reviews</span></span>
            </a>
          </div>
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
