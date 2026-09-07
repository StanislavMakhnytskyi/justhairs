"use client";

import { useSyncExternalStore } from "react";

/**
 * Opens the device's default maps app: a `geo:` intent on Android (respects the
 * user's default), Apple Maps on iOS, Google Maps on the web.
 */
export function OpenInMaps({
  lat,
  lon,
  label,
  className,
}: {
  lat: number;
  lon: number;
  label: string;
  className?: string;
}) {
  const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  const href = useSyncExternalStore(
    () => () => {},
    () => {
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/.test(ua)) {
        return `https://maps.apple.com/?ll=${lat},${lon}&q=${encodeURIComponent(label)}`;
      }
      if (/Android/.test(ua)) {
        return `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(label)})`;
      }
      return web;
    },
    () => web,
  );

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      Open in maps
    </a>
  );
}
