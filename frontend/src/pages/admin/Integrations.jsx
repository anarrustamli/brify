import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const blankSmtp = { host: "", port: "587", username: "", password: "", from_email: "", use_tls: true };
const blankGeneric = { api_key: "", api_secret: "", webhook: "" };

export default function Integrations() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [smtp, setSmtp] = useState(blankSmtp);
  const [creds, setCreds] = useState(blankGeneric);

  const load = () => api.get("/admin/integrations").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openEdit = (item) => {
    setEditing(item);
    setSmtp(blankSmtp);
    setCreds(blankGeneric);
  };

  const save = async (e) => {
    e.preventDefault();
    if (editing.key === "smtp") {
      if (!smtp.host || !smtp.username) { toast.error("Host və username tələb olunur"); return; }
      await api.put(`/admin/integrations/${editing.key}`, {
        name: editing.name,
        configured: true,
        masked_fields: { host: smtp.host, username: smtp.username, from_email: smtp.from_email },
        secrets: smtp,
      });
    } else {
      await api.put(`/admin/integrations/${editing.key}`, {
        name: editing.name,
        configured: true,
        masked_fields: { api_key: "•••" + (creds.api_key.slice(-4) || ""), api_secret: "•••" },
        secrets: creds,
      });
    }
    toast.success("İnteqrasiya saxlandı");
    setEditing(null);
    load();
  };

  return (
    <div>
      <PageHeader title="İnteqrasiyalar və açarlar" description="Real inteqrasiya açarlarını burada idarə edin" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => (
          <div key={i.key} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Globe className="w-5 h-5 text-slate-600" /></div>
              {i.configured && (i.functional
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" title="Aktiv işləyir" />
                : <Clock className="w-5 h-5 text-amber-500" title="Açarlar saxlanılıb, lakin hələ istifadə olunmur" />)}
            </div>
            <h3 className="font-semibold mt-3">{i.name}</h3>
            <div className="text-xs text-slate-500 mt-1">
              {!i.configured ? "Konfiqurasiya edilməyib" : i.functional ? "Aktivdir — email göndərmək üçün istifadə olunur" : "Açarlar saxlanılıb (hələ heç bir backend funksiyası ona bağlı deyil)"}
            </div>
            <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => openEdit(i)}>Konfiqurasiya et</Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.name} konfiqurasiyası</DialogTitle></DialogHeader>
          {editing && editing.key === "smtp" && (
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>SMTP Host</Label><Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" className="h-11" /></div>
                <div><Label>Port</Label><Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} className="h-11" /></div>
              </div>
              <div><Label>Username</Label><Input value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} className="h-11" /></div>
              <div><Label>Password</Label><Input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} className="h-11" /></div>
              <div><Label>Göndərən email (From)</Label><Input value={smtp.from_email} onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })} placeholder="noreply@bizmarket.az" className="h-11" /></div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={smtp.use_tls} onCheckedChange={(v) => setSmtp({ ...smtp, use_tls: !!v })} /> STARTTLS istifadə et
              </label>
              <p className="text-xs text-emerald-700">Bu inteqrasiya REAL-dır: konfiqurasiya etdikdən sonra şifrə bərpası və email təsdiqi linkləri faktiki olaraq bu SMTP ilə göndərilir.</p>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
            </form>
          )}
          {editing && editing.key !== "smtp" && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>API açarı</Label><Input type="password" value={creds.api_key} onChange={(e) => setCreds({ ...creds, api_key: e.target.value })} placeholder="•••" className="h-11" /></div>
              <div><Label>Secret</Label><Input type="password" value={creds.api_secret} onChange={(e) => setCreds({ ...creds, api_secret: e.target.value })} className="h-11" /></div>
              <div><Label>Webhook URL (istəyə bağlı)</Label><Input value={creds.webhook} onChange={(e) => setCreds({ ...creds, webhook: e.target.value })} className="h-11" /></div>
              <p className="text-xs text-amber-700">Diqqət: bu inteqrasiya üçün backend məntiqi hələ yazılmayıb. Açarlar saxlanılacaq, amma platforma onlardan hələ istifadə etmir.</p>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
