import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[48px] font-bold tracking-tight text-brand">404</p>
      <h1 className="text-[19px] font-bold text-text-primary">Page not found</h1>
      <p className="text-[14px] text-text-secondary">
        The page you&rsquo;re looking for doesn&rsquo;t exist.
      </p>
      <Button href="/">Back to home</Button>
    </div>
  );
}
