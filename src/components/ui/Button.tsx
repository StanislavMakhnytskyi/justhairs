import { forwardRef } from "react";
import Link from "next/link";
import { type VariantProps } from "tailwind-variants";
import { tv } from "@/lib/tv";
import { Spinner } from "./Spinner";
import { LinkPendingBar } from "./LinkPendingBar";

export const button = tv({
  // `loading` and `disabled` are distinct: a loading button keeps its variant
  // colour (just dimmed + a spinner) so a mid-submit CTA doesn't look broken;
  // only a genuinely disabled button greys out. The greying selector excludes
  // `[data-loading]`.
  base: "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-btn)] font-bold tracking-tight transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150 ease-[var(--ease-out)] select-none motion-safe:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:pointer-events-none data-[loading]:cursor-wait data-[loading]:opacity-70 [&:disabled:not([data-loading])]:bg-surface-sunken [&:disabled:not([data-loading])]:text-text-tertiary [&:disabled:not([data-loading])]:border-transparent [&:disabled:not([data-loading])]:shadow-none",
  variants: {
    variant: {
      primary: "bg-brand text-text-on-brand hover:bg-brand-hover active:bg-brand-press",
      outlined:
        "border border-brand text-brand hover:bg-brand-subtle active:bg-brand-subtle",
      text: "text-brand hover:bg-brand-subtle active:bg-brand-subtle",
      white:
        "bg-surface-card text-text-primary shadow-[var(--shadow-sm)] hover:bg-surface-sunken active:bg-surface-sunken",
      success: "bg-success text-white hover:brightness-95 active:brightness-90",
    },
    size: {
      lg: "h-12 px-5 text-body",
      md: "h-10 px-4 text-label",
      sm: "h-8 px-3 text-caption",
    },
    block: { true: "w-full" },
  },
  defaultVariants: { variant: "primary", size: "lg" },
});

type BaseProps = VariantProps<typeof button> & {
  className?: string;
  /** Shows a spinner alongside the label and blocks further presses. */
  loading?: boolean;
};

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = BaseProps &
  Omit<React.ComponentProps<typeof Link>, "className"> & { href: string };

export const Button = forwardRef<HTMLButtonElement, ButtonProps | AnchorProps>(
  function Button({ variant, size, block, className, loading, ...props }, ref) {
    const cls = button({ variant, size, block, className });

    if ("href" in props && props.href !== undefined) {
      const { children, ...anchor } = props as AnchorProps;
      return (
        <Link className={cls} {...anchor}>
          {children}
          <LinkPendingBar />
        </Link>
      );
    }

    const { children, disabled, ...rest } = props as ButtonProps;
    return (
      <button
        ref={ref}
        className={cls}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);
