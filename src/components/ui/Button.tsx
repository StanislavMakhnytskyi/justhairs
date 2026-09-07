import { forwardRef } from "react";
import Link from "next/link";
import { tv, type VariantProps } from "tailwind-variants";

export const button = tv({
  base: "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-bold tracking-tight transition-colors select-none focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:pointer-events-none disabled:bg-surface-sunken disabled:text-text-tertiary",
  variants: {
    variant: {
      primary: "bg-brand text-text-on-brand hover:bg-brand-hover active:bg-brand-press",
      outlined:
        "border border-brand text-brand hover:bg-brand-subtle active:bg-brand-subtle",
      text: "text-brand hover:bg-brand-subtle active:bg-brand-subtle",
      white:
        "bg-surface-card text-text-primary shadow-[var(--shadow-card)] hover:bg-surface-sunken active:bg-surface-sunken",
      success: "bg-success text-white hover:brightness-95 active:brightness-90",
    },
    size: {
      lg: "h-12 px-5 text-[16px]",
      md: "h-10 px-4 text-[14px]",
      sm: "h-8 px-3 text-[12px]",
    },
    block: { true: "w-full" },
  },
  defaultVariants: { variant: "primary", size: "lg" },
});

type BaseProps = VariantProps<typeof button> & { className?: string };

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = BaseProps &
  Omit<React.ComponentProps<typeof Link>, "className"> & { href: string };

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps | AnchorProps
>(function Button({ variant, size, block, className, ...props }, ref) {
  const cls = button({ variant, size, block, className });
  if ("href" in props && props.href !== undefined) {
    return <Link className={cls} {...(props as AnchorProps)} />;
  }
  return (
    <button ref={ref} className={cls} {...(props as ButtonProps)} />
  );
});
