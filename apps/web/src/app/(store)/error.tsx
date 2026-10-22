"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap empty" style={{ minHeight: "60svh" }}>
      <h1 style={{ fontSize: "var(--t-head)" }}>The menu didn&apos;t load</h1>
      <p>We couldn&apos;t reach the PEAK kitchen system. Give it a moment and try again.</p>
      <button type="button" className="btn" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
