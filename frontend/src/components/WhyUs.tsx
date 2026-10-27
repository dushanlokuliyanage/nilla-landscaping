const points = [
  {
    num: "01",
    title: "A team you can trust",
    desc: "Fully insured work, with care taken around your home and garden.",
  },
  {
    num: "02",
    title: "Clear, reliable visits",
    desc: "We agree a time, keep you informed, and turn up ready to work.",
  },
  {
    num: "03",
    title: "Thoughtful garden care",
    desc: "Practical choices that suit your space and respect the life growing in it.",
  },
  {
    num: "04",
    title: "A finish we stand by",
    desc: "Experienced hands and attention to the small details that bring a garden together.",
  },
];

export default function WhyUs() {
  return (
    <section id="why-us" className="relative overflow-hidden bg-forest py-16 text-cream sm:py-20 md:py-32">
      <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full border border-cream/10" />
      <div className="pointer-events-none absolute -right-8 -top-12 h-64 w-64 rounded-full border border-cream/10" />

      <div className="relative mx-auto grid max-w-6xl gap-9 px-4 sm:gap-14 sm:px-5 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">
            The Nilla difference
          </span>
          <h2 className="mt-5 max-w-lg font-display text-3xl font-medium leading-tight sm:text-4xl md:text-5xl">
            Good garden work feels good from the start.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-cream/70">
            From the first visit to the final tidy-up, we make looking after your
            outdoor space feel straightforward.
          </p>
          <div className="mt-10 h-px w-16 bg-sage/70" />
          <p className="mt-4 font-display text-lg italic text-sage">
            Thoughtful work. Lasting care.
          </p>
        </div>

        <div className="border-t border-cream/20">
          {points.map(({ num, title, desc }) => (
            <article
              key={num}
              className="grid gap-3 border-b border-cream/20 py-7 sm:grid-cols-[3.5rem_1fr] sm:gap-5 sm:py-8"
            >
              <span className="pt-1 font-display text-sm text-sage">{num}</span>
              <div>
                <h3 className="font-display text-xl font-medium text-cream sm:text-2xl">
                  {title}
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-cream/65">
                  {desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
