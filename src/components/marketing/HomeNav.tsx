import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#team", label: "Team" },
  { href: "#reviews", label: "Reviews" },
  { href: "#visit", label: "Visit us" },
];

/** Desktop-only sticky top bar for the home page (the mobile layout has none). */
export function HomeNav() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-border-default bg-surface-app/85 backdrop-blur-md lg:block">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-10">
        <Link href="/" aria-label="justhairs home" className="mr-auto">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="flex gap-7">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-label font-bold text-text-secondary transition-colors duration-150 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Button href="/book" size="md">
          Book now
        </Button>
      </div>
    </header>
  );
}
