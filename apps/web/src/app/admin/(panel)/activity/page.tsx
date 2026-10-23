"use client";
import { StateBlock } from "@/components/admin/ui";
import { useApi } from "@/lib/useApi";

type Entry = { id: string; action: string; entity: string; entityId: string | null; details: unknown; createdAt: string; by: string | null };

const LABEL: Record<string, string> = {
  "item.create": "Created item",
  "item.update": "Edited item",
  "item.options": "Changed item choices",
  "category.create": "Created category",
  "category.update": "Edited category",
  "category.delete": "Deleted category",
  "settings.update": "Updated site settings",
  "order.payment": "Recorded payment change",
};

function describe(details: unknown) {
  if (!details || typeof details !== "object") return null;
  return Object.entries(details as Record<string, unknown>)
    .map(([k, v]) => (v && typeof v === "object" && "from" in v ? `${k}: ${String((v as { from: unknown }).from)} → ${String((v as unknown as { to: unknown }).to)}` : `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`))
    .join(" · ");
}

export default function ActivityPage() {
  const { data, error, loading, refetch } = useApi<Entry[]>("/api/admin/audit");
  return (
    <>
      <div className="adm-head">
        <h1>Activity</h1>
        <span className="adm-muted">Last 100 changes to the menu, settings and payments. Order stage changes live in each order&apos;s history.</span>
      </div>
      <StateBlock loading={loading && !data} error={data ? null : error} onRetry={refetch} empty={data?.length === 0 ? "No changes recorded yet." : undefined}>
        <div className="table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td>{e.by ?? "—"}</td>
                  <td>{LABEL[e.action] ?? e.action}</td>
                  <td className="adm-muted">{describe(e.details) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateBlock>
    </>
  );
}
