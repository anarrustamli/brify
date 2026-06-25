import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Eye, Lock, Mail, MessageSquare, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import api, { API } from "@/lib/api";

const API_ROOT = API.replace(/\/api$/, "");
const avatarUrl = (url) => (url?.startsWith("http") ? url : url ? `${API_ROOT}${url}` : "");

const tabs = [
  { key: "profile", label: "Profil" },
  { key: "notifications", label: "Bildirişlər" },
  { key: "security", label: "Təhlükəsizlik" },
];

const NOTIFICATION_ROWS = [
  { key: "brief_viewed", icon: Eye, title: "Brief oxundu bildirişi", desc: "Göndərdiyiniz brief-lər qarşı tərəf tərəfindən baxıldıqda xəbərdar olun." },
  { key: "new_proposal", icon: Mail, title: "Yeni təklif bildirişi", desc: "Xidmət təminatçıları yeni qiymət təklifi göndərdikdə xəbərdar olun." },
  { key: "new_message", icon: MessageSquare, title: "Mesaj bildirişi", desc: "Yeni bir mesaj aldığınızda dərhal xəbər tutun." },
  { key: "platform_updates", icon: Megaphone, title: "Platforma yenilikləri", desc: "Yeni funksiyalar və platforma xəbərləri haqqında bülletenlər." },
];

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("profile");
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Şəkil maksimum 5MB ola bilər"); return; }
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("module", "avatar");
      form.append("file", file);
      const { data } = await api.post("/media", form, { headers: { "Content-Type": "multipart/form-data" } });
      await api.put("/me/user", { avatar_url: data.public_url });
      if (refresh) await refresh();
      toast.success("Profil şəkli yeniləndi");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Şəkil yüklənmədi");
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    api.get("/me/notification-preferences").then((r) => setNotifPrefs(r.data)).catch(() => {});
  }, []);

  async function handleNotifToggle(key, value) {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      await api.put("/me/notification-preferences", { [key]: value });
    } catch {
      toast.error("Yadda saxlanılmadı, yenidən cəhd edin");
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  }

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-2 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">Hesab mərkəzi</div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Ayarlar</h1>
        <p className="mt-1.5 text-slate-500">Hesab parametrlərini idarə edin</p>
      </div>

      <div className="border-b border-slate-200">
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
        <div className="grid gap-5 md:grid-cols-12">
          <form onSubmit={handleProfileSave} className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)] md:col-span-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ad Soyad" value={form.name} onChange={(value) => setForm((c) => ({ ...c, name: value }))} testId="settings-name" />
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="mt-1 h-11 bg-slate-50 text-slate-500" />
              </div>
              <Field label="Telefon" value={form.phone} onChange={(value) => setForm((c) => ({ ...c, phone: value }))} testId="settings-phone" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-6 hover:bg-blue-700" data-testid="settings-save">
                {saving ? "Saxlanır..." : "Yadda saxla"}
              </Button>
            </div>
          </form>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)] md:col-span-4">
            <div className="relative mx-auto mb-4 h-32 w-32">
              {user?.avatar_url ? (
                <img src={avatarUrl(user.avatar_url)} alt={user.name} className="h-full w-full rounded-full border-4 border-slate-100 object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-slate-100 bg-blue-50 text-3xl font-bold text-blue-700">{user?.name?.slice(0, 2)?.toUpperCase() || "BM"}</div>
              )}
              <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 rounded-full bg-blue-600 p-2 text-white shadow-lg disabled:opacity-50"
                aria-label="Profil şəklini dəyiş"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-slate-950">Profil Şəkli</h2>
            <p className="mt-2 text-sm text-slate-500">{uploadingAvatar ? "Yüklənir..." : "Şəkli dəyişmək üçün redaktə düyməsinə klikləyin. Maksimum 5MB."}</p>
          </div>
        </div>
      )}

      {active === "notifications" && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-950">Email Bildirişləri</h2>
            <p className="text-sm text-slate-500">Hansı yenilikləri email vasitəsilə almaq istədiyinizi seçin.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {NOTIFICATION_ROWS.map((row) => (
              <ToggleRow
                key={row.key}
                icon={row.icon}
                title={row.title}
                desc={row.desc}
                checked={notifPrefs?.[row.key]}
                onChange={(v) => handleNotifToggle(row.key, v)}
              />
            ))}
          </div>
        </div>
      )}

      {active === "security" && (
        <div className="space-y-5">
          <form onSubmit={handlePasswordChange} className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Lock className="h-5 w-5" /></div>
              <h2 className="text-lg font-semibold text-slate-950">Şifrəni Yenilə</h2>
            </div>
            <div className="grid max-w-md gap-4">
              <PasswordField label="Cari şifrə" value={pwForm.current_password} onChange={(v) => setPwForm((c) => ({ ...c, current_password: v }))} />
              <PasswordField label="Yeni şifrə" value={pwForm.new_password} onChange={(v) => setPwForm((c) => ({ ...c, new_password: v }))} />
              <PasswordField label="Yeni şifrəni təkrarla" value={pwForm.confirm} onChange={(v) => setPwForm((c) => ({ ...c, confirm: v }))} />
              <Button type="submit" disabled={pwSaving} className="mt-2 rounded-lg bg-slate-950 hover:bg-slate-800">
                {pwSaving ? "Dəyişdirilir..." : "Şifrəni dəyişdir"}
              </Button>
            </div>
          </form>
          <div className="rounded-lg border border-rose-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-rose-700">Hesabı sil</h2>
            <p className="mt-1 text-sm text-slate-500">Hesabınızı sildikdən sonra bütün məlumatlarınız daimi olaraq silinəcək və bərpa edilə bilməyəcək.</p>
            <Button variant="outline" disabled={deleting} onClick={handleDeleteAccount} className="mt-4 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50">
              {deleting ? "Silinir..." : "Hesabımı sil"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, testId }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11" data-testid={testId} />
    </div>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="password" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11" />
    </div>
  );
}

function ToggleRow({ icon: Icon, title, desc, checked, onChange }) {
  const enabled = Boolean(checked);
  return (
    <div className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="text-sm text-slate-500">{desc}</p>
        </div>
      </div>
      <button type="button" onClick={() => onChange(!enabled)} className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-slate-300"}`} aria-label={title}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
