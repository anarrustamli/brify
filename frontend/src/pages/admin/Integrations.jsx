import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/Common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Integrations() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creds, setCreds] = useState({ api_key: "", api_secret: "", webhook: "" });

  const load = () => api.get("/admin/integrations").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.put(`/admin/integrations/${editing.key}`, { name: editing.name, configured: true, masked_fields: { api_key: "•••" + (creds.api_key.slice(-4) || ""), api_secret: "•••" } });
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
              {i.configured && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>
            <h3 className="font-semibold mt-3">{i.name}</h3>
            <div className="text-xs text-slate-500 mt-1">{i.configured ? "Konfiqurasiya edilib" : "Konfiqurasiya edilməyib"}</div>
            <Button size="sm" variant="outline" className="w-full mt-4" onClick={() => setEditing(i)}>Konfiqurasiya et</Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.name} konfiqurasiyası</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>API açarı</Label><Input type="password" value={creds.api_key} onChange={(e) => setCreds({ ...creds, api_key: e.target.value })} placeholder="•••" className="h-11" /></div>
              <div><Label>Secret</Label><Input type="password" value={creds.api_secret} onChange={(e) => setCreds({ ...creds, api_secret: e.target.value })} className="h-11" /></div>
              <div><Label>Webhook URL (istəyə bağlı)</Label><Input value={creds.webhook} onChange={(e) => setCreds({ ...creds, webhook: e.target.value })} className="h-11" /></div>
              <p className="text-xs text-slate-500">Bu açarlar masked formada saxlanılır. Real inteqrasiya sonradan aktivləşdiriləcək.</p>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Yadda saxla</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
