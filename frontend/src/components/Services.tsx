import { Scissors, Flower2, TreeDeciduous, Droplets, Sprout, Hammer } from "lucide-react";

const services = [
  { icon: Scissors, title: "Lawn Care", desc: "Regular mowing, edging and feeding to keep your lawn thick, green and healthy." },
  { icon: Flower2, title: "Garden Design", desc: "Custom garden layouts that suit your space, style and how you use it." },
  { icon: TreeDeciduous, title: "Tree Trimming", desc: "Safe pruning and shaping to keep trees healthy and your property tidy." },
  { icon: Droplets, title: "Irrigation", desc: "Efficient watering systems that keep your garden thriving with less waste." },
  { icon: Sprout, title: "Landscaping", desc: "Full landscape transformations, from planning to planting." },
  { icon: Hammer, title: "Maintenance", desc: "Ongoing care packages so your outdoor space always looks its best." },
];

export default function Services() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-5 py-24">
      <div className="max-w-xl">
        <span className="text-sm font-medium uppercase tracking-[0.18em] text-leaf">
          What we do
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold text-forest md:text-5xl">
          Our Services
        </h2>
        <p className="mt-4 text-forest/70">
          From a quick lawn refresh to a full garden redesign, we handle every
          part of the work.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="group  border border-forest/10 bg-white/60 p-7 transition hover:border-leaf/40 hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/40 transition group-hover:bg-leaf group-hover:text-cream">
              <Icon className="h-6 w-6 text-forest transition group-hover:text-cream" />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-forest">
              {title}
            </h3>
            <p className="mt-2 text-sm text-forest/65">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}