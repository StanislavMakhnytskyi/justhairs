"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
        <button
          onClick={reset}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "#6440fe",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
