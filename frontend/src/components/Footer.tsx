import Logo from "@/components/Logo";

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=100088261375182&mibextid=ZbWKwL", icon: "facebook" },
  { label: "Twitter", href: "https://twitter.com/", icon: "twitter" },
  { label: "YouTube", href: "https://www.youtube.com/", icon: "youtube" },
  { label: "Instagram", href: "https://instagram.com/nilla_.landscaping?igshid=OGQ5ZDc2ODk2ZA==", icon: "instagram" },
];

function SocialIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" {...common}><path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" /></svg>;
  if (name === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>;
  if (name === "youtube") return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" {...common}><path d="M22 12s0-3.2-.4-4.8a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12Z" /><path d="m10 9 5 3-5 3V9Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" {...common}><path d="M22 5.9a8 8 0 0 1-2.4.7 4.2 4.2 0 0 0 1.8-2.3 8.2 8.2 0 0 1-2.7 1 4.1 4.1 0 0 0-7 3.7A11.7 11.7 0 0 1 3.2 4.8a4.1 4.1 0 0 0 1.3 5.5 4 4 0 0 1-1.9-.5v.1a4.1 4.1 0 0 0 3.3 4 4 4 0 0 1-1.9.1 4.1 4.1 0 0 0 3.8 2.9A8.2 8.2 0 0 1 2 18.6a11.6 11.6 0 0 0 6.3 1.8c7.6 0 11.8-6.3 11.8-11.8v-.5A8.4 8.4 0 0 0 22 5.9Z" /></svg>;
}


export default function Footer() {
  return (
    <footer className="border-t border-forest/10 bg-cream py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <Logo />
        <p className="text-sm text-forest/60">
          &copy; {new Date().getFullYear()} Nilla Landscaping and Garden Service. All rights reserved.
        </p>
        <nav aria-label="Social media" className="flex items-center gap-2">
          {socialLinks.map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              title={label}
              className="flex size-10 items-center justify-center border border-forest/15 text-forest transition-colors hover:bg-forest hover:text-cream"
            >
              <SocialIcon name={icon} />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
