import Link from "next/link";

export function PageFooter() {
  return (
    <footer className="border-t border-border-default px-6 py-6 text-[12px] text-text-secondary">
      <p>
        justhairs is a demo / portfolio project — not a real salon. Test mode; no real
        payments or appointments.
      </p>
      <p className="mt-2 flex gap-4">
        <Link href="/privacy" className="font-bold text-link">
          Privacy Policy
        </Link>
        <Link href="/terms" className="font-bold text-link">
          Terms of Service
        </Link>
      </p>
    </footer>
  );
}
