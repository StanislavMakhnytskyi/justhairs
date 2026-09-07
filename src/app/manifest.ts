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
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
