import { useEffect, useState, type FormEvent } from "react";
import { createTeamMember, getRoles, getTeam, updateTeamRole, updateTeamStatus, type AdminAccount, type AdminRole } from "@/lib/api";
import { teamAccountSchema, validationMessage } from "@/lib/validation";

export default function Team() {
  const [members, setMembers] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { const [team, availableRoles] = await Promise.all([getTeam(), getRoles()]); setMembers(team); setRoles(availableRoles.filter((item) => item.isActive)); if (!availableRoles.some((item) => item.key === role && item.isActive)) setRole(availableRoles.find((item) => item.isActive && item.key !== "owner")?.key ?? ""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load team"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    const parsed = teamAccountSchema.safeParse({ email: email.trim(), password, role });
    if (!parsed.success) { setError(validationMessage(parsed.error)); return; }
    try { await createTeamMember(parsed.data); setEmail(""); setPassword(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to create account"); }
  }
  async function changeRole(member: AdminAccount, next: string) {
    try { await updateTeamRole(member.id, next); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update role"); }
  }
  async function toggle(member: AdminAccount) {
    try { await updateTeamStatus(member.id, !member.isActive); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update account"); }
  }
  return <div className="min-h-screen"><div className="admin-main">
      <main className="mx-auto max-w-6xl px-5 py-8">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Team access</h1><p className="mt-1.5 text-sm text-forest/60">Create staff accounts and manage their access.</p>
    {error && <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form noValidate onSubmit={submit} className="mt-6 grid gap-3 border border-forest/10 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className=" border border-forest/15 px-3 py-2.5 text-sm" />
      <input required type="password" minLength={8} placeholder="Temporary password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} className=" border border-forest/15 px-3 py-2.5 text-sm" />
      <select value={role} onChange={e => setRole(e.target.value)} className=" border border-forest/15 px-3 py-2.5 text-sm">{roles.filter((item) => item.key !== "owner").map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select>
      <button className=" bg-forest px-4 py-2.5 text-sm font-medium text-cream shadow-sm transition hover:bg-leaf">Add account</button>
    </form>
    <div className="mt-6 overflow-x-auto border border-forest/10 bg-white shadow-sm"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-forest/10 bg-sage/20 text-forest/70"><tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Added</th><th className="p-3">Actions</th></tr></thead><tbody>
      {loading ? <tr><td className="p-4" colSpan={5}>Loading team…</td></tr> : members.map(m => <tr key={m.id} className="border-b border-forest/5"><td className="p-3">{m.email}</td><td className="p-3">{m.role === "owner" ? "Owner" : <select value={m.role} onChange={e => void changeRole(m, e.target.value)} className="border border-forest/15 bg-white px-2 py-1">{roles.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select>}</td><td className="p-3">{m.isActive ? "Active" : "Inactive"}</td><td className="p-3">{new Date(m.createdAt).toLocaleDateString()}</td><td className="p-3">{m.role !== "owner" && <button onClick={() => void toggle(m)} className="text-leaf underline">{m.isActive ? "Deactivate" : "Reactivate"}</button>}</td></tr>)}
    </tbody></table></div>
  </main>
      </div></div>;
}
