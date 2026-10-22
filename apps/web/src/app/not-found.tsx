import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap empty" style={{ minHeight: "70svh" }}>
      <h1 style={{ fontSize: "var(--t-head)" }}>Nothing poured here</h1>
      <p>This page doesn&apos;t exist, or the drink has left the menu.</p>
      <Link className="btn" href="/menu">
        Back to the menu
      </Link>
    </main>
  );
}
