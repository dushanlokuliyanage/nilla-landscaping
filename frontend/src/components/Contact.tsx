import ContactForm from "@/components/ContactForm";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl border-t border-forest/15 px-5 py-24">
      <div className="grid gap-14 lg:grid-cols-2">
        <div>
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-leaf">
            Get in touch
          </span>
          <h2 className="mt-3 font-display text-4xl font-semibold text-forest md:text-5xl">
            Get a Free Quote
          </h2>
          <p className="mt-4 max-w-md text-forest/70">
            Tell us a little about your garden and we&apos;ll get back to you
            with a free, no-obligation quote.
          </p>

          <div className="mt-10 space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage/40">
                <Phone className="h-5 w-5 text-forest" />
              </div>
              <span className="text-forest/80">+94 75 925 2256</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage/40">
                <Mail className="h-5 w-5 text-forest" />
              </div>
              <span className="text-forest/80">info@nillagarden.lk</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage/40">
                <MapPin className="h-5 w-5 text-forest" />
              </div>
              <span className="text-forest/80">Colombo, Sri Lanka</span>
            </div>
          </div>
        </div>

        <div className=" border border-forest/10 bg-white/60 p-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
