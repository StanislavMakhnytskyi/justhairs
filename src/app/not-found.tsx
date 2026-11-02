import { BookShell } from "@/components/ticket/BookShell";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <BookShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-12 text-center">
        <p className="text-display text-link" aria-hidden>
          404
        </p>
        <h1 className="text-title text-text-primary">Page not found</h1>
        <p className="max-w-[32ch] text-body text-text-secondary">
          The page you&rsquo;re looking for doesn&rsquo;t exist.
        </p>
        <Button href="/">Back to home</Button>
        <Button href="/book" variant="text">
          Book an appointment
        </Button>
      </div>
    </BookShell>
  );
}
