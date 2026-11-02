/**
 * Keyboard model shared by the booking radiogroups (`DateStrip`, `SlotGrid`):
 * one tab stop per group (roving tabindex), arrows move focus, Home/End jump
 * to the ends. Choosing still takes Space/Enter (or a tap) — picking a time
 * moves the flow to the next step, so selection must not follow focus.
 *
 * Returns the index to focus next, or null if the key isn't ours.
 */
export function rovingIndex(
  key: string,
  current: number,
  count: number,
  { columns = 1, page = 0 }: { columns?: number; page?: number } = {},
): number | null {
  if (count === 0) return null;
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  switch (key) {
    case "ArrowLeft":
      return clamp(current - 1);
    case "ArrowRight":
      return clamp(current + 1);
    case "ArrowUp":
      return clamp(current - columns);
    case "ArrowDown":
      return clamp(current + columns);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    case "PageUp":
      return page ? clamp(current - page) : null;
    case "PageDown":
      return page ? clamp(current + page) : null;
    default:
      return null;
  }
}
