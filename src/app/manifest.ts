import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "justhairs",
    short_name: "justhairs",
    description: "Book haircuts, colour and styling for men and women.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6440fe",
    // icon-192.png lives in /public (resized from src/app/icon.png);
    // /icon.png and /apple-icon.png are served by the file-based icons.
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon.png", type: "image/png", sizes: "512x512" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
