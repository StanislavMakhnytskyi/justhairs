import { createTV } from "tailwind-variants";

/**
 * `tv()` preconfigured so our custom type-scale utilities — `text-display`,
 * `text-title`, `text-heading`, `text-subhead`, `text-body`, `text-label`,
 * `text-caption` (defined in globals.css `@theme`) — are recognised as
 * font-sizes by the class merger. Without this, tailwind-merge treats
 * `text-body` as a `text-*` colour and silently drops a co-occurring
 * `text-text-primary` (or vice-versa) inside a `tv()` recipe.
 *
 * Plain `cn()` (clsx, no merge) is unaffected; import this only where `tv()` is used.
 */
export const tv = createTV({
  twMergeConfig: {
    theme: {
      text: [
        "display",
        "title",
        "heading",
        "subhead",
        "body",
        "label",
        "caption",
      ],
    },
  },
});
