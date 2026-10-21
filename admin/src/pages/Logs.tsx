import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
import { getAccessLogs, getActivityLogs, type AccessLog, type ActivityLog } from "@/lib/api";

export default function Logs({ kind }: { kind: "activity" | "access" }) {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [access, setAccess] = useState<AccessLog[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    (kind === "activity" ? getActivityLogs().then(setActivity) : getAccessLogs().then(setAccess)).catch(e => setError(e instanceof Error ? e.message : "Unable to load log"));
  }, [kind]);
  return <div className="min-h-screen"><AdminHeader /><NavTabs /><main className="mx-auto max-w-6xl px-5 py-8">
    <h1 className="text-2xl font-semibold text-forest">{kind === "activity" ? "Activity log" : "Access log"}</h1><p className="mt-1 text-sm text-forest/60">Showing the latest 200 records.</p>
    {error ? <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : <div className="mt-6 overflow-x-auto border border-forest/10 bg-white/70"><table className="w-full text-left text-sm"><thead className="border-b border-forest/10 bg-sage/20 text-forest/70"><tr>{kind === "activity" ? <><th className="p-3">When</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Record</th><th className="p-3">Details</th></> : <><th className="p-3">When</th><th className="p-3">Email</th><th className="p-3">Event</th><th className="p-3">IP address</th><th className="p-3">Browser</th></>}</tr></thead><tbody>
      {kind === "activity" ? activity.map(log => <tr key={log.id} className="border-b border-forest/5"><td className="whitespace-nowrap p-3">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3">{log.adminEmail}</td><td className="p-3">{log.action}</td><td className="p-3">{log.entity}{log.entityId ? ` #${log.entityId}` : ""}</td><td className="max-w-sm p-3">{Object.entries(log.details ?? {}).map(([k,v]) => `${k}: ${String(v)}`).join(" · ") || "—"}</td></tr>) : access.map(log => <tr key={log.id} className="border-b border-forest/5"><td className="whitespace-nowrap p-3">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3">{log.email}</td><td className="p-3">{log.event.replaceAll("_", " ")}</td><td className="p-3">{log.ipAddress ?? "—"}</td><td className="max-w-xs truncate p-3" title={log.userAgent ?? ""}>{log.userAgent ?? "—"}</td></tr>)}
      {(kind === "activity" ? activity.length : access.length) === 0 && <tr><td className="p-4 text-forest/60" colSpan={5}>No log entries yet.</td></tr>}
    </tbody></table></div>}
  </main></div>;
}
