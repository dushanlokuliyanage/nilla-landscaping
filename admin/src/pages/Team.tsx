import { useEffect, useState, type FormEvent } from "react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
import { createTeamMember, getTeam, updateTeamRole, updateTeamStatus, type AdminAccount } from "@/lib/api";

export default function Team() {
  const [members, setMembers] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { setMembers(await getTeam()); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load team"); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await createTeamMember({ email, password, role }); setEmail(""); setPassword(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to create account"); }
  }
  async function changeRole(member: AdminAccount, next: "manager" | "staff") {
    try { await updateTeamRole(member.id, next); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update role"); }
  }
  async function toggle(member: AdminAccount) {
    try { await updateTeamStatus(member.id, !member.isActive); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update account"); }
  }
  return <div className="min-h-screen"><AdminHeader /><NavTabs /><main className="mx-auto max-w-6xl px-5 py-8">
    <h1 className="text-2xl font-semibold text-forest">Team access</h1><p className="mt-1 text-sm text-forest/60">Create staff accounts and manage their access.</p>
    {error && <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={submit} className="mt-6 grid gap-3 border border-forest/10 bg-white/70 p-5 sm:grid-cols-4">
      <input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className="border border-forest/15 px-3 py-2 text-sm" />
      <input required type="password" minLength={8} placeholder="Temporary password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} className="border border-forest/15 px-3 py-2 text-sm" />
      <select value={role} onChange={e => setRole(e.target.value as "manager" | "staff")} className="border border-forest/15 px-3 py-2 text-sm"><option value="staff">Staff</option><option value="manager">Manager</option></select>
      <button className="bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-leaf">Add account</button>
    </form>
    <div className="mt-6 overflow-x-auto border border-forest/10 bg-white/70"><table className="w-full text-left text-sm"><thead className="border-b border-forest/10 bg-sage/20 text-forest/70"><tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Added</th><th className="p-3">Actions</th></tr></thead><tbody>
      {loading ? <tr><td className="p-4" colSpan={5}>Loading team…</td></tr> : members.map(m => <tr key={m.id} className="border-b border-forest/5"><td className="p-3">{m.email}</td><td className="p-3">{m.role === "owner" ? "Owner" : <select value={m.role} onChange={e => void changeRole(m, e.target.value as "manager" | "staff")} className="border border-forest/15 bg-white px-2 py-1"><option value="staff">Staff</option><option value="manager">Manager</option></select>}</td><td className="p-3">{m.isActive ? "Active" : "Inactive"}</td><td className="p-3">{new Date(m.createdAt).toLocaleDateString()}</td><td className="p-3">{m.role !== "owner" && <button onClick={() => void toggle(m)} className="text-leaf underline">{m.isActive ? "Deactivate" : "Reactivate"}</button>}</td></tr>)}
    </tbody></table></div>
  </main></div>;
}
