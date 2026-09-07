import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "justhairs — book your look";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: 80,
          background: "linear-gradient(135deg, #6440fe, #3312cc)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          justhairs
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 700,
            marginTop: 12,
            lineHeight: 1.15,
          }}
        >
          <span>Book your look in</span>
          <span>under a minute</span>
        </div>
      </div>
    ),
    size,
  );
}
