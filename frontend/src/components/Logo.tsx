import Image from "next/image";

export default function Logo() {
  return (
    <span className="flex items-center gap-3">
      <Image
        src="/images/sprout-logo.svg"
        alt=""
        width={36}
        height={36}
        priority
        className="w-9 h-9 shrink-0"
      />
      <span className="leading-none">
        <span className="block font-display text-xl font-semibold text-forest">
          Nilla
        </span>
        <span className="block mt-1 text-[10px] uppercase tracking-[0.18em] text-forest/60">
          Landscaping &amp; Garden (PVT) LTD
        </span>
      </span>
    </span>
  );
}
