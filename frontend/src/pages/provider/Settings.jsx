import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/Common";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api";

const tabs = [
  { key: "profile", label: "Profil" },
  { key: "security", label: "Təhlükəsizlik" },
];

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("profile");
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (!window.confirm("Hesabınızı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.")) return;
    setDeleting(true);
    try {
      await api.delete("/me/account");
      toast.success("Hesabınız silindi");
      await logout();
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    } finally {
      setDeleting(false);
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Ad boş ola bilməz"); return; }
    setSaving(true);
    try {
      await api.put("/me/user", { name: form.name, phone: form.phone });
      if (refresh) await refresh();
      toast.success("Profil yadda saxlandı");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.new_password) { toast.error("Bütün sahələri doldurun"); return; }
    if (pwForm.new_password !== pwForm.confirm) { toast.error("Yeni şifrələr eyni deyil"); return; }
    if (pwForm.new_password.length < 6) { toast.error("Şifrə ən az 6 simvol olmalıdır"); return; }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success("Şifrə uğurla dəyişdirildi");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Xəta baş verdi");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Ayarlar" />

      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`relative py-4 text-sm font-semibold transition-colors ${active === tab.key ? "text-blue-700" : "text-slate-500 hover:text-blue-700"}`}
            >
              {tab.label}
              {active === tab.key && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 rounded-full bg-blue-600" />}
            </button>
          ))}
        </div>
      </div>

      {active === "profile" && (
        <form onSubmit={handleProfileSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <Label>Ad</Label>
            <Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className="h-11 mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="h-11 mt-1 bg-slate-50" />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} className="h-11 mt-1" />
          </div>
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Saxlanır..." : "Yadda saxla"}
          </Button>
        </form>
      )}

      {active === "security" && (
        <div className="space-y-5">
          <form onSubmit={handlePasswordChange} className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Lock className="h-5 w-5" /></div>
              <h2 className="text-lg font-semibold text-slate-950">Şifrəni Yenilə</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Cari şifrə</Label>
                <Input type="password" value={pwForm.current_password} onChange={(e) => setPwForm((c) => ({ ...c, current_password: e.target.value }))} className="h-11 mt-1" />
              </div>
              <div>
                <Label>Yeni şifrə</Label>
                <Input type="password" value={pwForm.new_password} onChange={(e) => setPwForm((c) => ({ ...c, new_password: e.target.value }))} className="h-11 mt-1" />
              </div>
              <div>
                <Label>Yeni şifrəni təkrarla</Label>
                <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((c) => ({ ...c, confirm: e.target.value }))} className="h-11 mt-1" />
              </div>
              <Button type="submit" disabled={pwSaving} className="bg-slate-950 hover:bg-slate-800">
                {pwSaving ? "Dəyişdirilir..." : "Şifrəni dəyişdir"}
              </Button>
            </div>
          </form>
          <div className="rounded-lg border border-rose-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-rose-700">Hesabı sil</h2>
            <p className="mt-1 text-sm text-slate-500">Hesabınızı sildikdən sonra bütün məlumatlarınız daimi olaraq silinəcək.</p>
            <Button variant="outline" disabled={deleting} onClick={handleDeleteAccount} className="mt-4 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50">
              {deleting ? "Silinir..." : "Hesabımı sil"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
