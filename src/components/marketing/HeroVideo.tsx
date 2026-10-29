"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HERO_IMAGE } from "@/lib/assets";

type Connection = { saveData?: boolean; effectiveType?: string };

const subscribeNever = () => () => {};

/** Autoplay is only polite when the visitor hasn't asked for less motion or
 *  less data. Read client-side only, so the static HTML never depends on it. */
function canAutoplay(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const conn = (navigator as Navigator & { connection?: Connection }).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType)) return false;
  return true;
}

/** Muted looping background that fades in over the poster image once it can
 *  play. The image underneath stays the LCP element; this never delays it. */
export function HeroVideo({ mp4, webm }: { mp4: string; webm: string }) {
  // false on the server and during hydration, then the real answer.
  const enabled = useSyncExternalStore(subscribeNever, canAutoplay, () => false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const pausedByUser = useRef(false);

  // Pause off-screen and in background tabs, resume unless the visitor paused.
  useEffect(() => {
    const video = ref.current;
    if (!enabled || !video) return;

    let visible = true;
    const sync = () => {
      if (visible && !document.hidden && !pausedByUser.current) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(video);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled]);

  if (!enabled) return null;

  function toggle() {
    const video = ref.current;
    if (!video) return;
    pausedByUser.current = !video.paused;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
    setPaused(video.paused);
  }

  return (
    <>
      <video
        ref={ref}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        poster={HERO_IMAGE}
        aria-hidden="true"
        tabIndex={-1}
        onCanPlay={() => setReady(true)}
        className={`absolute inset-0 -z-10 size-full object-cover transition-opacity duration-700 ease-[var(--ease-out)] ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? "Play background video" : "Pause background video"}
        className="absolute right-[var(--m)] top-5 z-10 [--m:max(1.25rem,calc((100vw_-_72rem)/2_+_2.5rem))] grid size-9 place-items-center rounded-pill bg-black/30 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
      </button>
    </>
  );
}
