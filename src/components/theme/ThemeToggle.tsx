"use client";

import { useSyncExternalStore } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getStoredTheme, setTheme, type Theme } from "./theme";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    getStoredTheme,
    () => "system",
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold text-text-primary">Appearance</span>
      <SegmentedTabs
        value={theme}
        onChange={(t) => {
          setTheme(t);
          listeners.forEach((cb) => cb());
        }}
        tabs={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
      />
    </div>
  );
}
