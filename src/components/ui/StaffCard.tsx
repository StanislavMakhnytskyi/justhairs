import { cn } from "@/lib/cn";
import { Avatar } from "./primitives";

export function StaffCard({
  name,
  subtitle,
  selected,
  onClick,
}: {
  name: string;
  subtitle?: string | null;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
        selected ? "border-brand bg-brand-subtle" : "border-border-default bg-surface-card",
      )}
    >
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-text-primary">{name}</p>
        {subtitle && (
          <p className="truncate text-[13px] text-text-secondary">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
