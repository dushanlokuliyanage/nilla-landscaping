const steps = [
  { num: "01", title: "Get in Touch", desc: "Tell us about your garden and what you're hoping for." },
  { num: "02", title: "Free Site Visit", desc: "We visit, assess your space, and put together a plan." },
  { num: "03", title: "We Get to Work", desc: "Our team carries out the work to a high standard." },
  { num: "04", title: "Enjoy the Result", desc: "Step back and enjoy your refreshed outdoor space." },
];

export default function Process() {
  return (

    <section id="process" className="mx-auto max-w-6xl px-5 py-24">

      
      <div className="max-w-xl">
        <span className="text-sm font-medium uppercase tracking-[0.18em] text-leaf">
          How it works
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold text-forest md:text-5xl">
          Our Process
        </h2>
      </div>

      <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.num} className="relative">
            <span className="font-display text-5xl font-semibold text-sage">
              {s.num}
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-forest">
              {s.title}
            </h3>
            <p className="mt-2 text-sm text-forest/65">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}