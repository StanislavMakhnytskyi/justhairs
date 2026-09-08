/** Shared look for the segmented controls (stateful `SegmentedTabs` +
 *  link-based `SegmentedLinks`). Plain constants — no client boundary. */
export const segmentedTrack =
  "flex gap-1 rounded-[var(--radius-sm)] bg-surface-sunken p-1";
export const segmentedItem =
  "flex-1 rounded-[6px] px-3 py-2 text-center text-label font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2";
export const segmentedItemActive =
  "bg-surface-card text-text-primary shadow-[var(--shadow-sm)]";
export const segmentedItemIdle = "text-text-secondary hover:text-text-primary";
