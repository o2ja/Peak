import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Server-side gate: every dashboard page is rendered only for a session the API recognises. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sid = (await cookies()).get("peak.sid");
  if (!sid) redirect("/admin/login");
  const res = await fetch(`${API_URL}/api/admin/me`, { headers: { cookie: `peak.sid=${sid.value}` }, cache: "no-store" }).catch(() => null);
  if (!res) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Dashboard unavailable</h1>
        <p>The PEAK API isn&apos;t answering. Check that it is running, then refresh.</p>
      </main>
    );
  }
  if (res.status === 401) redirect("/admin/login");
  if (!res.ok) throw new Error(`Admin check failed (${res.status})`);
  const admin: { name: string; email: string } = await res.json();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
