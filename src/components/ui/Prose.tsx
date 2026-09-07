import { cn } from "@/lib/cn";

/** Long-form text container — styles headings, paragraphs and lists. */
export function Prose({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-4 text-[14px] leading-relaxed text-text-primary",
        "[&_h2]:mt-6 [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:text-text-primary",
        "[&_h2:first-child]:mt-0",
        "[&_p]:text-text-primary [&_a]:font-bold [&_a]:text-link [&_a]:underline",
        "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_li]:text-text-primary",
        "[&_strong]:font-bold",
        className,
      )}
    >
      {children}
    </div>
  );
}
