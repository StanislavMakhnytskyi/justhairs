"use client";

import { useEffect } from "react";
import { getStoredTheme, resolveTheme } from "@/components/theme/theme";

/**
 * A `notFound()` from the pay / confirmation pages is served as Next's
 * minimal error document (`<html id="__next_error__">`, real 404 status) and
 * rendered on the client, where the root layout's inline ThemeScript never
 * runs. Re-apply the stored theme so a dark-theme visitor doesn't get a white
 * card. A no-op when the attribute is already right.
 */
export function ApplyTheme() {
  useEffect(() => {
    try {
      const t = resolveTheme(getStoredTheme());
      if (document.documentElement.dataset.theme !== t) {
        document.documentElement.setAttribute("data-theme", t);
      }
    } catch {
      /* storage blocked: keep the default (light) theme */
    }
  }, []);
  return null;
}
