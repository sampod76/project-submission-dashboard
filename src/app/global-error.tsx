"use client";
import type { CSSProperties } from "react";
import type { RouteErrorProps } from "@/components/shared/route-state";

// This replaces the root layout, so it must work without its providers or styles.
export default function GlobalError({ reset }: RouteErrorProps) {
  const actionStyle: CSSProperties = {
    display: "inline-block",
    padding: "12px 20px",
    borderRadius: 8,
    border: "1px solid #007bff",
    font: "inherit",
    cursor: "pointer",
    textDecoration: "none",
  };
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          color: "#101d46",
          background: "#f0f9ff",
        }}
      >
        <main
          style={{
            minHeight: "100svh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <section
            style={{
              maxWidth: 440,
              width: "100%",
              padding: "40px 24px",
              borderRadius: 24,
              background: "white",
              textAlign: "center",
              boxShadow: "0 16px 48px rgba(42,112,170,0.08)",
            }}
          >
            <p style={{ color: "#007bff", fontWeight: 600 }}>Doctor Tracker</p>
            <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              We couldn&apos;t load the application. Please try again or return home.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{ ...actionStyle, background: "#007bff", color: "white" }}
              >
                Try again
              </button>
              <a href="/" style={{ ...actionStyle, color: "#007bff", background: "white" }}>
                Home
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
