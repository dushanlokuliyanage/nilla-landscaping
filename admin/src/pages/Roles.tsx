import { useEffect, useMemo, useState, type FormEvent } from "react";
import { KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination, { PageSizeControl, usePageSize } from "@/components/Pagination";
import { createRole, deleteRole, getRoles, updateRole, type AdminRole } from "@/lib/api";
import { roleFormSchema, validationMessage } from "@/lib/validation";

type RoleDraft = { key: string; name: string; description: string; isActive: boolean; permissions: string[] };
const permissionRows: { label: string; note: string; actions: Partial<Record<"create" | "read" | "update" | "delete" | "manage", string>> }[] = [
  { label: "Inquiries", note: "View, respond to, and remove customer inquiries", actions: { read: "inquiries.read", update: "inquiries.update", delete: "inquiries.delete" } },
  { label: "Products & content", note: "Products, gallery, videos, and media library", actions: { create: "products.create", read: "products.read", update: "products.update", delete: "products.delete" } },
  { label: "Orders", note: "View, update, and remove customer orders", actions: { read: "orders.read", update: "orders.update", delete: "orders.delete" } },
  { label: "Team accounts", note: "Create accounts, change roles, and deactivate access", actions: { create: "team.create", read: "team.read", update: "team.update", delete: "team.delete" } },
  { label: "Role settings", note: "Create, edit, and remove roles and permissions", actions: { create: "roles.create", read: "roles.read", update: "roles.update", delete: "roles.delete" } },
  { label: "Activity & access logs", note: "Review admin actions and sign-in history", actions: { read: "logs.read" } },
  { label: "Backup & restore", note: "Export system data and replace selected records from a backup", actions: { manage: "backup.manage" } },
];
const permissionActions = ["create", "read", "update", "delete", "manage"] as const;
const templates = [
  { label: "Content editor", permissions: ["products.manage"] },
  { label: "Customer support", permissions: ["inquiries.read", "inquiries.manage", "orders.read"] },
  { label: "Order coordinator", permissions: ["orders.read", "orders.manage"] },
];
const emptyDraft = (): RoleDraft => ({ key: "", name: "", description: "", isActive: true, permissions: [] });

export default function Roles() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AdminRole | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize();
  async function load() {
    setLoading(true);
    try { setRoles(await getRoles()); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load roles"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visibleRoles = useMemo(() => roles.filter((role) =>
    (statusFilter === "all" || (statusFilter === "active") === role.isActive) &&
    `${role.name} ${role.key} ${role.description}`.toLowerCase().includes(query.toLowerCase())
  ), [roles, query, statusFilter]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visibleRoles.length / pageSize)));
  const pageRoles = visibleRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [query, statusFilter, pageSize]);
  function edit(role?: AdminRole) {
    setEditingKey(role?.key ?? null);
    setDraft(role ? { key: role.key, name: role.name, description: role.description, isActive: role.isActive, permissions: role.permissions } : emptyDraft());
    setError("");
  }
  function togglePermission(permission: string) {
    if (!draft) return;
    setDraft({ ...draft, permissions: draft.permissions.includes(permission) ? draft.permissions.filter((item) => item !== permission) : [...draft.permissions, permission] });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const parsed = roleFormSchema.safeParse(draft);
    if (!parsed.success) { setError(validationMessage(parsed.error)); return; }
    setSaving(true); setError("");
    try {
      if (editingKey) {
        const { key: _key, ...updates } = parsed.data;
        await updateRole(editingKey, updates);
      } else await createRole(parsed.data);
      setDraft(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save role"); }
    finally { setSaving(false); }
  }
  return <div className="min-h-screen"><div className="admin-main">
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Roles &amp; permissions</h1><p className="mt-1.5 text-sm text-forest/60">Choose what each role can view and manage across the admin panel.</p></div>
        <div className="flex flex-wrap items-center gap-2"><PageSizeControl pageSize={pageSize} onChange={setPageSize} /><button onClick={() => edit()} className="flex items-center gap-2 bg-forest px-4 py-2.5 text-sm font-medium text-cream hover:bg-leaf"><Plus className="h-4 w-4" /> Add role</button></div>
      </div>
      {error && !draft && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 border border-forest/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-forest"><Search className="h-4 w-4" /> Filters</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-forest/60">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles…" className="mt-1 block w-full border border-forest/15 px-3 py-2.5 text-sm text-forest" /></label>
          <label className="text-xs text-forest/60">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-1 block w-full border border-forest/15 px-3 py-2.5 text-sm text-forest"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[{ label: "Total roles", value: roles.length, icon: KeyRound }, { label: "Active", value: roles.filter((role) => role.isActive).length, icon: ShieldCheck }, { label: "Custom roles", value: roles.filter((role) => !role.isSystem).length, icon: Plus }].map((stat) => <div key={stat.label} className="flex items-center justify-between border border-forest/10 bg-white p-4"><div><p className="text-xs text-forest/55">{stat.label}</p><p className="mt-1 text-2xl font-semibold text-forest">{stat.value}</p></div><stat.icon className="h-5 w-5 text-leaf" /></div>)}
      </div>
      <div className="mt-5 space-y-3">
        {loading ? <div className="border border-forest/10 bg-white p-6 text-sm text-forest/60">Loading roles…</div> : pageRoles.map((role) => <article key={role.key} className="flex flex-wrap items-start justify-between gap-4 border border-forest/10 border-l-4 border-l-leaf bg-white p-5 shadow-sm">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-forest">{role.name}</h2><code className="border border-forest/10 bg-sage/10 px-2 py-0.5 text-[11px] text-forest/65">{role.key}</code><span className={`px-2 py-0.5 text-[11px] ${role.isActive ? "bg-sage/25 text-forest" : "bg-stone-100 text-stone-600"}`}>{role.isActive ? "Active" : "Inactive"}</span>{role.isSystem && <span className="border border-forest/10 px-2 py-0.5 text-[11px] text-forest/55">Built-in</span>}</div><p className="mt-2 text-sm text-forest/65">{role.description || "No description provided."}</p><div className="mt-3 flex flex-wrap gap-1.5">{role.permissions.includes("*") ? <span className="bg-leaf/10 px-2 py-1 text-xs text-forest">Full access</span> : role.permissions.length ? role.permissions.map((permission) => <span key={permission} className="bg-sage/15 px-2 py-1 text-[11px] text-forest/75">{permission}</span>) : <span className="text-xs text-forest/45">No permissions assigned</span>}</div></div>
          <div className="flex shrink-0 gap-2">{role.key === "owner" ? <span className="px-3 py-2 text-xs font-medium text-forest/50">Protected</span> : <button onClick={() => edit(role)} className="flex items-center gap-1.5 border border-forest/15 px-3 py-2 text-sm text-forest hover:bg-sage/10"><Pencil className="h-4 w-4" /> Edit</button>}{!role.isSystem && <button aria-label={`Delete ${role.name}`} onClick={() => setRemoving(role)} className="border border-red-200 px-3 py-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}</div>
        </article>)}
        {!loading && !visibleRoles.length && <div className="border border-forest/10 bg-white p-8 text-center text-sm text-forest/55">No roles match those filters.</div>}
      </div>
      <Pagination page={currentPage} pageSize={pageSize} total={visibleRoles.length} onChange={setPage} />
      <p className="mt-4 text-xs text-forest/50">Showing {visibleRoles.length} of {roles.length} roles. The Owner role always retains full access and cannot be changed or removed.</p>
    </main>
    {draft && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-forest/50 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDraft(null); }}>
      <form noValidate onSubmit={(event) => void save(event)} className="my-auto max-h-[calc(100vh-24px)] w-full max-w-3xl overflow-y-auto border border-forest/15 bg-cream shadow-2xl sm:max-h-[calc(100vh-48px)]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-forest/10 bg-cream px-5 py-4 sm:px-6"><div><h2 className="text-lg font-semibold text-forest">{editingKey ? "Edit role" : "Create role"}</h2><p className="mt-1 text-sm text-forest/60">Set role details and choose its permissions.</p></div><button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="border border-forest/15 p-1.5 text-forest/60 hover:bg-white"><X className="h-4 w-4" /></button></div>
        <div className="space-y-4 px-5 py-5 sm:px-6">
          {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!editingKey && <label className="block text-sm font-medium text-forest">Role key *<input required pattern="[a-z][a-z0-9_-]{1,39}" title="Use lowercase letters, numbers, hyphens, or underscores; start with a letter." value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="content_editor" className="mt-1.5 block w-full border border-forest/15 px-3 py-2.5 font-normal" /><span className="mt-1 block text-xs font-normal text-forest/55">Lowercase identifier used when assigning team members.</span></label>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-forest">Name *<input required minLength={2} maxLength={60} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Content editor" className="mt-1.5 block w-full border border-forest/15 px-3 py-2.5 font-normal" /></label><label className="block text-sm font-medium text-forest">Status<select value={draft.isActive ? "active" : "inactive"} onChange={(event) => setDraft({ ...draft, isActive: event.target.value === "active" })} className="mt-1.5 block w-full border border-forest/15 px-3 py-2.5 font-normal"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
          <label className="block text-sm font-medium text-forest">Description<textarea maxLength={240} rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What this role is responsible for" className="mt-1.5 block w-full resize-y border border-forest/15 px-3 py-2.5 font-normal" /></label>
          {!editingKey && <div><p className="text-xs font-semibold uppercase tracking-wide text-forest/60">Starter ideas</p><div className="mt-2 flex flex-wrap gap-2">{templates.map((template) => <button key={template.label} type="button" onClick={() => setDraft({ ...draft, name: template.label, description: template.label === "Content editor" ? "Manage products, gallery projects, videos, and the media library." : template.label === "Customer support" ? "Respond to inquiries and view customer orders." : "Review orders and keep their status up to date.", permissions: template.permissions })} className="border border-forest/15 bg-white px-3 py-1.5 text-xs text-forest hover:bg-sage/15">{template.label}</button>)}</div></div>}
          <section><div className="flex items-end justify-between gap-4"><div><h3 className="text-sm font-semibold text-forest">Permissions</h3><p className="mt-1 text-xs text-forest/55">Choose the actions this role can perform in each admin area.</p></div><button type="button" onClick={() => setDraft({ ...draft, permissions: [] })} className="text-xs font-medium text-leaf underline">Clear all</button></div>
            <div className="mt-3 overflow-x-auto border border-forest/10"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-sage/15 text-[10px] uppercase tracking-wide text-forest/60"><tr><th className="p-3">Admin area</th>{permissionActions.map((action) => <th key={action} className="w-20 p-3 text-center">{action}</th>)}</tr></thead><tbody>{permissionRows.map((row) => <tr key={row.label} className="border-t border-forest/5"><td className="p-3"><span className="block font-medium text-forest">{row.label}</span><span className="mt-0.5 block text-xs text-forest/50">{row.note}</span></td>{permissionActions.map((action) => { const permission = row.actions[action]; return <td key={action} className="p-3 text-center">{permission ? <input type="checkbox" aria-label={`${row.label}: ${action}`} checked={draft.permissions.includes(permission)} onChange={() => togglePermission(permission)} className="h-4 w-4 accent-[#2f6b3a]" /> : <span className="text-forest/25">—</span>}</td>; })}</tr>)}</tbody></table></div>
          </section>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-forest/10 bg-cream px-5 py-4 sm:px-6"><button type="button" disabled={saving} onClick={() => setDraft(null)} className="border border-forest/20 px-4 py-2.5 text-sm text-forest hover:bg-white">Cancel</button><button disabled={saving} className="bg-forest px-4 py-2.5 text-sm font-medium text-cream hover:bg-leaf disabled:opacity-60">{saving ? "Saving…" : editingKey ? "Update role" : "Create role"}</button></div>
      </form>
    </div>}
    {removing && <ConfirmDialog title={`Delete ${removing.name}?`} description="This role will be removed permanently. Team members must be reassigned before a role can be deleted." onClose={() => setRemoving(null)} onConfirm={async () => { await deleteRole(removing.key); await load(); }} />}
  </div></div>;
}
