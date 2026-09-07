import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/cn";

/**
 * next/image with a tinted box behind it and a short fade-in, so photos settle
 * instead of popping against white.
 *
 * Deliberately does not animate the image's own opacity. A mount-time fade
 * finishes long before the bytes arrive, and anything that leaves the image at
 * opacity 0 when it doesn't run (un-hydrated page, frozen background tab)
 * hides the photo outright. The "settle" comes from the box behind it and,
 * for the large images, `blurDataURL` — next/image's blur-to-sharp swap is
 * tied to the actual load and can't get stuck.
 *
 * `fill` images render bare: their parent is already the positioning context,
 * so wrapping them would break the layout.
 */
export function SmoothImage({
  className,
  wrapperClassName,
  wrapperStyle,
  blurDataURL,
  alt,
  ...props
}: Omit<ImageProps, "placeholder"> & {
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}) {
  const img = (
    <Image
      alt={alt}
      {...props}
      {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
      className={className}
    />
  );

  if (props.fill) return img;

  return (
    <span
      style={wrapperStyle}
      className={cn(
        "relative inline-block overflow-hidden bg-surface-sunken align-top",
        wrapperClassName,
      )}
    >
      {img}
    </span>
  );
}
