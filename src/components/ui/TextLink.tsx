import Link from "next/link";
import { cn } from "@/lib/cn";

// `after:` gives a taller invisible tap target without a layout-shifting margin.
const cls =
  "relative inline-block text-label font-bold text-link underline-offset-2 transition-colors after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2";

export function TextLink({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(cls, className)}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(cls, className)}>
      {children}
    </Link>
  );
}
