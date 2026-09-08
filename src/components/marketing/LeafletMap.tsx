"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { SALON } from "@/lib/salon";

const PIN = `
<svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.4 21.7 14 22.2a1.5 1.5 0 0 0 2 0C16.6 36.7 30 25.5 30 15 30 6.7 23.3 0 15 0Z" fill="#6440FE"/>
  <circle cx="15" cy="15" r="5.5" fill="#fff"/>
</svg>`;

// Esri's grey canvas basemaps — clean, minimal, no API key.
function tileUrl() {
  const dark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.hasAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const style = dark ? "World_Dark_Gray_Base" : "World_Light_Gray_Base";
  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/{z}/{y}/{x}`;
}

export function LeafletMap() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let map: import("leaflet").Map | undefined;
    let disposed = false;

    const init = () => import("leaflet").then(({ default: L }) => {
      if (disposed || !el || (el as { _leaflet_id?: number })._leaflet_id) return;

      map = L.map(el, {
        center: [SALON.lat, SALON.lon],
        zoom: 16,
        scrollWheelZoom: false,
      });

      L.tileLayer(tileUrl(), {
        maxZoom: 16,
        attribution:
          'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; ' +
          "sources: Esri, HERE, Garmin, OpenStreetMap contributors",
      }).addTo(map);

      L.marker([SALON.lat, SALON.lon], {
        icon: L.divIcon({
          html: PIN,
          className: "",
          iconSize: [30, 38],
          iconAnchor: [15, 38],
        }),
        keyboard: false,
      })
        .addTo(map)
        .bindPopup(`<b>${SALON.name}</b><br>${SALON.addressLines.join(", ")}`);

      setTimeout(() => map?.invalidateSize(), 150);
    });

    // The map sits well below the fold — don't spend ~45KB of Leaflet on it
    // until the reader is nearly there. The container is already sized, so
    // deferring costs no layout shift.
    if (typeof IntersectionObserver === "undefined") {
      void init();
      return () => {
        disposed = true;
        map?.remove();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void init();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);

    return () => {
      disposed = true;
      observer.disconnect();
      map?.remove();
    };
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Map showing ${SALON.name}`}
      className="h-44 w-full"
    />
  );
}
