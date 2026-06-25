import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { adminListItems } from "@/lib/adminData";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Ban, RotateCcw } from "lucide-react";

const ROLES = ["buyer", "provider", "admin"];
const STATUSES = ["active", "suspended", "inactive", "deleted"];

const EMPTY_FORM = { name: "", email: "", phone: "", role: "buyer", status: "active", password: "" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: "create"|"edit", data: {} }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // user id

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/admin/users?limit=200");
      setUsers(adminListItems(r.data));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal({ mode: "create" });
  }

  function openEdit(u) {
    setForm({ name: u.name || "", email: u.email || "", phone: u.phone || "", role: u.role || "buyer", status: u.status || "active", password: "" });
    setModal({ mode: "edit", id: u.id });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.email.trim()) { toast.error("Email tələb olunur"); return; }
    setSaving(true);
    try {
      if (modal.mode === "create") {
        await api.post("/admin/users", form);
        toast.success("İstifadəçi yaradıldı");
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/admin/users/${modal.id}`, payload);
        toast.success("Dəyişikliklər saxlandı");
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspend(u) {
    const nextStatus = u.status === "suspended" ? "active" : "suspended";
    try {
      await api.put(`/admin/users/${u.id}`, { status: nextStatus });
      toast.success(nextStatus === "suspended" ? "İstifadəçi dayandırıldı" : "İstifadəçi aktivləşdirildi");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("İstifadəçi silindi");
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    }
  }

  return (
    <div>
      <PageHeader
        title="İstifadəçilər"
        description={`${users.length} istifadəçi`}
        action={
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Yeni istifadəçi
          </Button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-4 text-left">Ad</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Rol</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Qeydiyyat</th>
              <th className="p-4 text-right">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Yüklənir...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">İstifadəçi yoxdur</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{u.name}</td>
                <td className="p-4 text-slate-700">{u.email}</td>
                <td className="p-4">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">{u.role}</span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : u.status === "deleted" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                    {u.status || "active"}
                  </span>
                </td>
                <td className="p-4 text-slate-500 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString("az-AZ") : "—"}</td>
                <td className="p-4 text-right flex justify-end gap-2">
                  {u.status === "suspended" ? (
                    <button onClick={() => toggleSuspend(u)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600" title="Aktivləşdir"><RotateCcw className="h-4 w-4" /></button>
                  ) : (
                    <button onClick={() => toggleSuspend(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600" title="Dayandır"><Ban className="h-4 w-4" /></button>
                  )}
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600" title="Redaktə et"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600" title="Sil"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{modal.mode === "create" ? "Yeni istifadəçi" : "İstifadəçini redaktə et"}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <Label>Ad</Label>
                <Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className="mt-1 h-10" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className="mt-1 h-10" required />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} className="mt-1 h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rol</Label>
                  <select value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>{modal.mode === "create" ? "Şifrə" : "Yeni şifrə (boş qoysanız dəyişməz)"}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} className="mt-1 h-10" placeholder={modal.mode === "edit" ? "Dəyişdirmək istəmirsinizsə boş buraxın" : ""} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setModal(null)} className="flex-1">Ləğv et</Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {saving ? "Saxlanır..." : modal.mode === "create" ? "Yarat" : "Saxla"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">İstifadəçini sil</h2>
            <p className="text-sm text-slate-500 mb-5">Bu istifadəçini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Ləğv et</Button>
              <Button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white">Sil</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
